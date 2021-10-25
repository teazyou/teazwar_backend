import _ from 'lodash'

const config = require('../../../config')
const gameConfig = require('../../../game/config')

const { importDefaultByFilename } = require('../../../helpers/files/imports.helper')

const Helpers = require('../../../helpers')
const GameHelpers = require('../../../game/helpers')
const Languages = require('../../../languages')
const Services = importDefaultByFilename('../../backend/services', '.service')
const Models = importDefaultByFilename('../../backend/models', '.model')
const Payloads = importDefaultByFilename('../../backend/payloads', '.payload')
const Apis = importDefaultByFilename('../../backend/apis', '.api')
const GameModules = importDefaultByFilename('../../game/modules', '.modules')
const GameAuras = importDefaultByFilename('../../game/auras', '.aura')

import ModelSuperclass from './model.superclass'
class EmptyModel extends ModelSuperclass {}

export default class {

  constructor (requestType, routeParam, body = {}) {
    this.requestType = requestType
    this.routeParam = routeParam
    const [method, path] = routeParam.route
    routeParam.method = method
    routeParam.path = path
    this.build_ressources(body)
  }

  async requestHandler () {
    const { data: d } = this
    const {
      path = '',
      isPublic = false,
      isTeazwar = false,
      isAdmin = false,
      isSubscriber = false,
      isFollower = false,
      isTwitch = false,
    } = this.routeParam

    // console.info(this.helpers.jwtoken.generate('1e8b6bf0-1b50-11ec-85ec-4d033c80c035'))

    await this.identify(isTwitch)

    if (path.startsWith('/command/')) {
      await this.authorizeTeazwar()
      await this.identifyChatUser()
    }

    if (!d.user && (!isPublic || isTeazwar || isAdmin || isSubscriber || isFollower)) {
      this.StopPipeline('router_isPublic')
    }

    const teazwarUsername = config.twitch.chatbot.tmiOpts.identity.username.toLowerCase()
    if (isTeazwar && d.user.username.toLowerCase() !== teazwarUsername.toLowerCase()) {
      this.StopPipeline('router_onlyTeazwar')
    }

    if ((isAdmin || isSubscriber || isFollower)
    && !d.user) {
      this.StopPipeline('router_priviliege')
    }

    if (isAdmin) { await this.authorizeAdmin() }

    if (isSubscriber && (!d.user || d.user.isSubscriber !== 'yes')) {
      this.StopPipeline('priviliegeReq_noSub')
    }

    if (isFollower && (!d.user || d.user.isFollower !== 'yes')) {
      this.StopPipeline('priviliegeReq_noFollow')
    }

    if (this.validator) {
      await this.validator()
    }

    await this.handler()
  }

  StopPipeline (error_key = 'unknow_error') {
    this.payload.error_key = error_key
    throw new this.renders.StopPipeline(error_key)
  }

  async identify (isTwitch = false) {
    const { helpers: h, services: s, data: d, body: b } = this

    if (b.jwtoken) {

      if (typeof (b.jwtoken) !== 'string' || !b.jwtoken.length) {
        this.StopPipeline('jwtoken_missing')
      }

      const decryptedJwtoken = h.jwtoken.decrypt(b.jwtoken, isTwitch)
      if (decryptedJwtoken === false) {
        this.StopPipeline('jwtoken_invalid')
      }
      d.jwtoken = decryptedJwtoken.jwtoken

      const userKey = !isTwitch ? 'user_uuid' : 'user_id'
      d[userKey] = decryptedJwtoken[userKey]

      let isUser = null
      if (d.user_uuid && d.jwtoken) {
        isUser = await s.users.getByUserUuid(d.user_uuid)
      } else if (d.user_id && d.jwtoken) {
        isUser = await s.users.getByUserId('user_id', d.user_id)
      }

      if (isUser && isUser.jwtoken === d.jwtoken.token) {
        d.user = isUser

      } else {
        delete d.user_uuid
        delete d.user_id
        delete d.jwtoken
      }

    }
  }

  async identifyChatUser () {
    const { services: s, data: d, twitch: t } = this

    if (t.userId) {
      d.user = await s.users.getByUserId(t.userId)
      d.user_uuid = _.get(d, 'user.uuid', null)

    } else {
      delete d.user
      delete d.user_uuid
    }

  }

  authorizeTeazwar () {
    const { data: d } = this
    const botUsername = config.twitch.chatbot.tmiOpts.identify.username
    if (!d.user || !d.user.username !== botUsername) {
      this.StopPipeline('user.notTeazwar')
    }
  }

  async authorizeAdmin () {
    const { services: s, data: d } = this
    const { uuid: user_uuid } = d.user

    if (d.user && (d.user.username === 'teazyou'
    || d.user.username === 'teazwar')) {
      return true
    }

    d.admin = await s.admins.getByUserUuid(user_uuid)

    if (!d.admin) { this.StopPipeline('router_admin') }
  }

  build_ressources (body) {
    const bodyRedis = _.get(body, 'big_data.redis', undefined)
    const bodySocket = _.get(body, 'big_data.socket', undefined)
    const bodyInteraction = _.get(body, 'big_data.interaction', undefined)

    const ressources = {
      body,
      apis: Apis,
      helpers: _.merge({}, Helpers, GameHelpers),
      data: {},
      db: {},
      payload: {},
      renders: this.init_renders(),
      log: msg => process.stdout.write(`${msg}\n`),
      config: _.merge({}, config, gameConfig),
      lang: Languages,
    }

    if (bodyInteraction) {
      _.set(ressources, 'payload.big_data.interaction', bodyInteraction)
    }

    if (bodySocket) {
      ressources.socket = bodySocket
    }

    if (bodyRedis) {
      _.set(body, 'big_data.redis', undefined)
      ressources.redis = bodyRedis

    } else {
      ressources.helpers.redis.connect('controller.superclass')
      ressources.redis = ressources.helpers.redis
    }

    const modelRessources = { helpers: Helpers }
    const models = {}
    _.forEach(Models, (Model, name) => { models[name] = new Model(modelRessources) })
    _.forEach(Services, (Service, name) => {
      if (!models[name]) { models[name] = new EmptyModel(modelRessources) }
    })

    this.services = {}
    _.forEach(Services, (Service, name) => {
      this.services[name] = new Service({
        ...ressources,
        services: this.services,
        models,
      })
    })

    const auras = {}
    _.forEach(GameAuras, (Aura, name) => { auras[name] = Aura })

    this.modules = {}
    _.forEach(GameModules, (Module, name) => {
      this.modules[name] = new Module({
        ...ressources,
        services: this.services,
        auras,
      })
    })

    this.payloads = {}
    _.forEach(Payloads, (Payload, name) => {
      this.payloads[name] = new Payload({
        ...ressources,
        services: this.services,
      })
    })

    _.forEach(ressources, (ressource, name) => { this[name] = ressource })
  }

  init_renders () {
    return {
      ...Helpers.renders[this.requestType],
    }
  }
}

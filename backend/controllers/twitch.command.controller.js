import _ from 'lodash'

import ControllerSuperclass from '../application/superclass/controller.superclass'
const { xp, vvs } = require('../../config')

export default [
  {
    isTeazwar: true,
    route: ['post', '/twitch/command/xp'],
    Controller: class extends ControllerSuperclass {
      async handler () {
        const { renders: r, services: s } = this
        const username = _.get(this, 'req.body.twitchData.userstate.[\'display-name\']',
          _.get(this, 'req.body.twitchData.userstate.username', '??'))
        // await s.eventsGlobal.addEventForTwitch('say_command_xp', [
        //   username,
        //   xp.xpPerMin,
        //   xp.xpPerMin * xp.multiplierFollower,
        //   xp.xpPerMin * xp.multiplierSubscriber,
        //   xp.mathXpRequis,
        // ])
      }
    },
  },
]
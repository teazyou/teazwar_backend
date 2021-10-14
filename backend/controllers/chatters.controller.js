import _ from 'lodash'
import ControllerSuperclass from '../application/superclass/controller.superclass'

export default [
  {
    route: ['post', '/cron/chatters/listing'],
    isPublic: false,
    Controller: class extends ControllerSuperclass {
      async handler () {
        const { services: s, payloads: p, apis: a } = this
        try {
  
          const chatters = await a.chatters.get()

          // const chatters_count = s.chatters.getCountFromTwitch(chatters)
          // await s.eventsGlobal.addEventForDiscord('chatters_count', { chatters_count })

          const chatter_list = s.chatters.getChattersFromTwitch(chatters)
  
          await s.chatters.addOrIncrement(chatter_list)

          await s.users.setOnline(chatter_list)
          
          this.payload = p.cron.success()
          return true

        } catch (err) {
          console.error(err)
          this.payload = p.cron.error()
          return false
        }
      }
    },
  },
  {
    route: ['post', '/cron/chatters/validate'],
    isPublic: false,
    Controller: class extends ControllerSuperclass {
      async handler () {
        const { services: s, payloads: p, apis: a } = this
        try {
  
          const chatters = await s.chatters.getNextValidateList()

          if (chatters.length === 0) {
            this.payload = p.cron.empty()
            return true
          }

          const chatterUsernames = chatters.map(c => c.username)

          const twitchUsers = await a.users.getByUsernames(chatterUsernames)

          const users = await s.users.addOrUpdate(twitchUsers)
          const allUsers = users.added.concat(users.updated)

          await s.userXp.addMissingEntry(allUsers)
          await s.userChat.addMissingEntry(allUsers)
          await s.userAttributes.addMissingEntry(allUsers)

          const chatters_xp_gains = await s.userXp.addXpGain(allUsers, chatters)
          // await s.eventsGlobal.addEventForDiscord('chatters_xp_gains', { chatters_xp_gains })

          const allUserUsernames = allUsers.map(u => u.username)

          await s.chatters.resetByUsernames(allUserUsernames)

          this.payload = p.cron.success()

        } catch (err) {
          console.error(err)
          this.payload = p.cron.error()
        }
        return true
      }
    },
  },
  {
    route: ['post', '/cron/chatters/bots'],
    isPublic: false,
    Controller: class extends ControllerSuperclass {
      async handler () {
        const { services: s, payloads: p, apis: a } = this
        try {
  
          const botsList = await a.bots.list()

          const taggedBots = await s.users.tagBots(botsList)

          if (taggedBots.length) {
            // await s.eventsGlobal.addEvent('chatters_bots_detected', { chatters_bots_detected: taggedBots })
          }

          this.payload = !taggedBots.length ? p.cron.empty() : p.cron.success()

        } catch (err) {
          console.error(err)
          this.payload = p.cron.error()
        }
        return true
      }
    },
  },
]
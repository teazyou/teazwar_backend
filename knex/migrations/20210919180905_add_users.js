const { createTableDefaultSetup } = require('../../helpers/files/knex.helper')

const tableName = 'users'

exports.up = function (knex) {
  return knex.schema.createTable(tableName, table => {
    createTableDefaultSetup(knex, table)

    table.text('jwtoken')

    table.string('user_id').notNullable()
    table.boolean('turbo').defaultTo(false)

    table.string('username').defaultTo('')
    table.string('display_name').defaultTo('')
    table.text('type')
    table.text('broadcaster_type')
    table.text('description')
    table.text('avatar_url')
    table.integer('view_count')
    table.text('twitch_created_at')

    table.enu('isFollower', ['maybe', 'no', 'yes']).notNullable().defaultTo('maybe')
    table.enu('isSubscriber', ['maybe', 'no', 'yes']).notNullable().defaultTo('maybe')
    table.enu('isBot', ['maybe', 'no', 'yes']).notNullable().defaultTo('maybe')

    table.biginteger('timestampExtensionUntill').defaultTo(0)
    table.biginteger('timestampOnlineUntill').defaultTo(0)
    table.biginteger('timestampUnFollowerCheck').defaultTo(0)
    table.biginteger('timestampNewFollowerCheck').defaultTo(0)
    table.biginteger('timestampFollowingCheck').defaultTo(0)

    table.integer('countFollow').defaultTo(0) // track when new following

    table.string('socket_id').defaultTo(null)
    table.string('discord_id').defaultTo(null)

  }).then(() => {
    const { users } = require('../seeds')
    return knex(tableName).insert(users)

  })
}

exports.down = function (knex) {
  return knex.schema.dropTableIfExists(tableName)
}

import ServiceSuperclass from '../application/superclass/service.superclass'

const table = 'discords'

export default class extends ServiceSuperclass {

  constructor (ressources) { super(table, __filename, ressources) }

  updateOrCreateOtp (discord_user, verify_otp) {
    const { helpers: h, config: { discord: { itvDiscordOtpValidity } } } = this

    const tsuDiscordOtpValid = h.date.timestamp() + itvDiscordOtpValidity

    const addOrUpdate = {
      verify_otp,
      discord_id: discord_user.id,
      discord_username: discord_user.username,
      discord_discriminator: discord_user.discriminator,
      isBot: !!discord_user.bot,
      isSystem: !!discord_user.system,
      tsuDiscordOtpValid,
    }

    return this.addOrUpd(addOrUpdate)
  }

  getByOtp (verify_otp) {
    return this.getLastWhere({ verify_otp })
  }

  validateByOtp (verify_otp) {
    const currTimestamp = this.helpers.date.timestamp()
    return this.updAllWhere({ verify_otp }, {
      verify_otp: null,
      tslDiscordOtpValidated: currTimestamp,
    })
  }

  deleteOtpByOtp (verify_otp) {
    return this.updAllWhere({ verify_otp }, { verify_otp: null })
  }

}

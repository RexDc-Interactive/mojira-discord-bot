import { MessageEmbed, MessageReaction, User } from 'discord.js';
import * as log4js from 'log4js';
import DiscordUtil from '../../util/DiscordUtil';
import EventHandler from '../EventHandler';
import BotConfig from '../../BotConfig';
import TaskScheduler from '../../tasks/TaskScheduler';
import RemoveVerificationTask from '../../tasks/RemoveVerificationTask';

export default class RemoveVerificationEventHandler implements EventHandler<'messageReactionAdd'> {
	public readonly eventName = 'messageReactionAdd';

	private logger = log4js.getLogger( 'RemoveVerificationEventHandler' );

	public onEvent = async ( reaction: MessageReaction, user: User ): Promise<void> => {
		const message = await DiscordUtil.fetchMessage( reaction.message );
		const verifiedRole = await message.guild.roles.fetch( BotConfig.verification.verifiedRole );

		if ( message.embeds.length == 0 ) return undefined;

		const targetUser = DiscordUtil.getMember( message.guild, message.embeds[0].fields[0].value.replace( /[<>@!]/g, '' ) );

		if ( reaction.emoji.name !== BotConfig.verification.removeLinkEmoji ) {
			this.logger.info( `User ${ user.tag } is attempting to remove the role '${ verifiedRole.name }' from user ${ ( await targetUser ).user.tag }` );

			try {
				const embed = new MessageEmbed( message.embeds[0] )
					.setColor( 'RED' )
					.setFooter( 'Unverified' );
				await message.edit( embed );
			} catch ( error ) {
				this.logger.error( error );
			}
		} else {
			this.logger.info( `User ${ user.tag } is removing the verification link from the Discord account ${ ( await targetUser ).user.tag }` );
			try {
				const embed = new MessageEmbed( message.embeds[0] )
					.setColor( 'DARK_RED' )
					.setFooter( 'Removing link' );
				await message.edit( embed );

				TaskScheduler.addOneTimeMessageTask(
					reaction.message,
					new RemoveVerificationTask(),
					BotConfig.verification.removeLinkWaitTime
				);
			} catch ( error ) {
				this.logger.error( error );
			}
		}

		try {
			await ( await targetUser ).roles.remove( verifiedRole );
		} catch ( error ) {
			this.logger.error( error );
		}
	};
}
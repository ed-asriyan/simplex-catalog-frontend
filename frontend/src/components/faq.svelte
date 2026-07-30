<script lang="ts">
</script>

<div class="uk-section uk-section-default uk-section-small">
    <div class="uk-container uk-text-center">
        <h2 class="uk-heading-medium uk-text-center">❓ FAQ</h2>
    </div>
</div>

<hr class="uk-margin-remove"/>

<div class="uk-section uk-section-muted uk-section-small">
    <div class="uk-container uk-container-small">
        <ul class="uk-accordion-default" uk-accordion>
            <li class="uk-open">
                <a class="uk-accordion-title" href="#">How to deploy your own server? <span uk-accordion-icon></span></a>
                <div class="uk-accordion-content">
                    <p>There are several guides to deploy your own SMP and XFTP server:</p>
                    <ul class="uk-list uk-list-bullet">
                        <li><a href="https://simplex.chat/docs/server.html" target="_blank">Official guide: SMP</a></li>
                        <li><a href="https://simplex.chat/docs/xftp-server.html" target="_blank">Official guide: XFTP</a></li>
                        <li><a href="https://github.com/ed-asriyan/simplex-servers-docker" target="_blank">Unofficial guide: SMP &amp; XFTP - one command with docker compose</a></li>
                    </ul>
                </div>
            </li>
            <li class="uk-open">
                <a class="uk-accordion-title" href="#">How to deploy your own relay? <span uk-accordion-icon></span></a>
                <div class="uk-accordion-content">
                    <a href="https://simplex.chat/docs/chat-relay.html" target="_blank">Official guide: Relay</a>
                </div>
            </li>
            <li class="uk-open">
                <a class="uk-accordion-title" href="#">How to create your own bot? <span uk-accordion-icon></span></a>
                <div class="uk-accordion-content">
                    <a href="https://github.com/simplex-chat/simplex-chat/tree/stable/bots#readme" target="_blank">Official guide: Bot</a>
                </div>
            </li>
            <li class="uk-open">
                <a class="uk-accordion-title" href="#">I submitted a bot but it didn't appear<span uk-accordion-icon></span></a>
                <div class="uk-accordion-content">
                    <ol>
                        <li>
                            Ensure that the bot's <a href="https://github.com/simplex-chat/simplex-chat/blob/stable/bots/api/TYPES.md#chatpeertype" target="_blank">ChatPeerType</a> is <code>bot</code>. If it's not set or is <code>human</code>, the bot won't appear.
                            <br/>
                            <i>Note: This prevents regular user contacts from appearing in the catalog.</i>
                        </li>
                        <li>
                            Wait up to 12 hours for the bot to appear in the catalog.
                        </li>
                        <li>
                            If the bot hasn't appeared after 12 hours, check if the bot is online and the submitted contact link is active. If it's online and the contact link is active, please submit <a href="https://github.com/ed-asriyan/simplex-catalog-bots-validator/issues/new" target="_blank">a bug report</a>.
                        </li>
                    </ol>
                </div>
            </li>
        </ul>
    </div>
</div>


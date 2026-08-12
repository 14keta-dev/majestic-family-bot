import { env } from './utils/env';
import { client } from './client';
import { ensureConfig } from './utils/config/store';
import { loadButtons } from './loaders/button.loader';
import { loadEvents } from './loaders/event.loader';
import { loadModals } from './loaders/modal.loader';
import { loadPrefixCommands } from './loaders/prefixCommand.loader';
import { loadSelects } from './loaders/select.loader';
import { loadCommands } from './loaders/slashCommand.loader';

ensureConfig();

loadButtons();
loadModals();
loadSelects();
loadCommands();
loadPrefixCommands();
loadEvents();

client.login(env.TOKEN);
export interface EventConfig {
    name: string;
    create_channel: string;
    tag_channel: string;
    replay_channel: string;
    allowed_roles: string[];
    create_message: string;
}
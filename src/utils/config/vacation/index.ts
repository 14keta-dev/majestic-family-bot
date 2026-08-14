export interface Vacation_config {
    //if true moderation get pinged before user can take vacation
    controlled: boolean;
    //ping roles for review of request
    ping_role?: string[];
    //incoming channel where request will be send 
    incoming_request?: string;
    //role that user will get when vacation gets approved
    vacation_role: string;
    //channel where panel with vacation will be send 
    panel_channel: string;
    //message id of panel
    panel_message: string;
}
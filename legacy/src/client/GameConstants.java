package client;
import java.awt.*;

public class GameConstants
{
    public static final byte COMMAND_NOOP = 0;
    public static final byte COMMAND_LOGIN_ERROR = 0;
    public static final byte COMMAND_LOGIN_SUCCESS = 1;
    public static final byte COMMAND_ENTER = 3;
    public static final byte COMMAND_EXIT = 4;
    public static final byte COMMAND_SAY = 5;
    public static final byte COMMAND_WHISPER = 6;
    public static final byte COMMAND_LIST_USERNAMES = 9;
    public static final byte COMMAND_NEW_USER = 13;
    public static final byte COMMAND_REMOVE_USER = 14;
    public static final byte COMMAND_TABLE_SAY = 18;
    public static final byte COMMAND_GS_CREATE_TABLE = 20;
    public static final byte COMMAND_GS_JOIN_TABLE = 21;
    public static final byte COMMAND_GS_LEAVE_TABLE = 22;
    public static final byte COMMAND_GS_ADD_CREDITS = 27;
    public static final byte COMMAND_GS_START_GAME = 30;
    public static final byte COMMAND_GS_START_GAME_REPLY = 31;
    public static final byte COMMAND_CHANGE_TEAMS = 40;
    public static final byte PUSH_USER_CHANGE_TEAMS = 41;
    public static final byte COMMAND_LIST_TABLES = 50;
    public static final byte PUSH_TABLE_CREATED = 60;
    public static final byte PUSH_TABLE_REMOVED = 61;
    public static final byte PUSH_USER_JOINED = 64;
    public static final byte PUSH_USER_LEFT = 65;
    public static final byte PUSH_TABLE_STATUS_CHANGED = 66;
    public static final byte PUSH_ERROR = 70;
    public static final byte PUSH_USER_RANK_CHANGED = 75;
    public static final byte GAME_PACKET = 80;
    public static final byte kTABLE_DELETED = 1;
    public static final byte kTABLE_COLLECTING = 2;
    public static final byte kTABLE_STARTING = 3;
    public static final byte kTABLE_PLAYING = 4;
    public static final String SOUND_ON_STRING = "Sound on";
    public static final String SOUND_OFF_STRING = "Sound off";
    public static final Font FONT_SMALL;
    public static final Font FONT_MEDIUM;
    public static final int BTN_TYPE_LOGIN = 0;
    public static final int BTN_TYPE_LOGOUT = 1;
    public static final int BTN_TYPE_SOUND = 2;
    public static final int BTN_TYPE_CREATE_TABLE = 3;
    public static final int BTN_TYPE_CREATE_TABLE_OPTIONS = 4;
    public static final int BTN_TYPE_PLAY = 5;
    public static final int BTN_TYPE_LEAVE_TABLE = 6;
    public static final int BTN_TYPE_URL = 7;
    public static final int BTN_TYPE_DIALOG = 8;
    public static final int BTN_TYPE_CREDITS = 9;
    public static final byte PREVIEW_SUBSCRIPTION = -1;
    public static final byte NO_SUBSCRIPTION = 0;
    public static final byte LEVEL1_SUBSCRIPTION = 1;
    public static final byte LEVEL2_SUBSCRIPTION = 2;
    public static final byte PERMISSION_HUGE_TABLES = 0;
    public static final byte PERMISSION_TEAM_TABLES = 1;
    
    static {
        FONT_SMALL = new Font("Helvetica", 0, 9);
        FONT_MEDIUM = new Font("Helvetica", 1, 11);
    }
}

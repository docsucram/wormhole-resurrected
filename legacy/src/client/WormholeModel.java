package client;
import java.util.*;
import javax.sound.sampled.*;
import java.io.*;
import java.awt.*;
import java.awt.event.*;

public class WormholeModel extends Model
{
    public static final int CREDITS_PER_POWERUP = 1;
    public static final byte kWORMHOLE_START = 100;
    public static final byte kWORMHOLE_STATE_UPDATE = 106;
    public static final byte kWORMHOLE_USE_POWERUP = 107;
    public static final byte kWORMHOLE_POWERUP_EVENT = 108;
    public static final byte kWORMHOLE_TEXT_EVENT = 109;
    public static final byte kWORMHOLE_GAME_OVER = 110;
    public static final byte kWORMHOLE_USER_WON = 111;
    public static final byte kWORMHOLE_TEAM_WON = 112;
    public static final byte BETA_TEAM = 1;
    public static final byte GAMMA_TEAM = 2;
    public static final Font fontSuperLarge;
    public static final Font fontLarge;
    public static final Font fontFourteen;
    public static final Font fontTwelve;
    public Color m_color;
    private Rectangle m_rectLogo;
    private Image m_imgLogo;		// background image in the center of the wormholes
    public static short m_gameID;
    public byte m_teamID;
    short m_gameSession;
    String m_strDamagedByPlayer;
    int m_damagingPowerup;
    Rectangle m_rectCenterBox;
    public static final Color g_titleColor;
    public boolean gameOver;
    public int down;
    public int up;
    public int left;
    public int right;
    public int fire;
    public int secondaryFire;
    public int tertiaryFire;
    SpriteArray badGuys;
    SpriteArray goodGuys;
    SpriteArray allSprites;
    PlayerInfo[] m_players;
    boolean refreshStatus;
    public int boardWidth;
    public int boardHeight;
    private final int STARS = 70;
    private int[] m_starX;
    private int[] m_starY;
    private int[] m_starSize;
    private int[] m_narrowStarX;
    private int[] m_narrowStarY;
    public static final int otherPlayersHeight = 474;
    public static final int otherPlayersWidth = 144;
    public static final int statusWidth = 430;
    public static final int statusHeight = 49;
    public static final int gboardWidth = 655;
    public static final int gboardHeight = 655;
    private int m_playerHeight;
    private int m_gameOverCycle;
    private static final int MAXGAMEOVERCYCLES = 120;
    private int m_playerFighterType;
    private int m_describedShip;
    private int m_currentFighterShade;
    public static Hashtable g_mediaTable;
    private ImagePanel m_pnlOtherPlayers;
    private ImagePanel m_pnlStatus;
    private ImagePanel m_pnlPlaying;
    private int m_introX;
    private int m_introY;
    private static final int INTRO_WIDTH = 410;
    private static final int INTRO_HEIGHT = 260;
    private static final int INTRO_VERT_GUTTER = 10;
    FontMetrics m_fm;
    public static final byte PERMISSION_NORMAL_SHIPS = 10;
    public static final byte PERMISSION_NEW_POWERUP_LEVEL_1 = 11;
    public static final byte PERMISSION_NEW_SHIP_LEVEL_1 = 12;
    public static final byte PERMISSION_NEW_POWERUP_LEVEL_2 = 13;
    public static final byte PERMISSION_NEW_SHIP_LEVEL_2 = 14;
    private static final int INTRO_IMG_WIDTH = 50;
    private static final int INTRO_SHIP_GUTTER = 5;
    private static final int INTRO_SHIP_W = 400;
    private static final int INTRO_SEL_PER_LINE = 8;
    private int m_intro_shipX;
    private int m_intro_shipY;
    private double m_zoomInIntro;
    private static final int INTRO_SHIP_LINES = 1;
    private static final int INTRO_SHIP_H = 50;
    private Rectangle m_changeTeamsRect;
    public static int gOrbitDistance;
    private static final int DEFAULT_ORBIT_DISTANCE = 270;
    int m_boardCenterX;
    int m_boardCenterY;
    Color[] m_borderShades;
    int totalBoardW;
    int totalBoardH;
    PlayerSprite m_player;
    public static final int NUMMAXPOWERUPS = 5;
    public int[] m_powerups;
    public static final int POWERUP_PADDING = 2;
    public static final int POWERUP_SIZE = 21;
    int m_numPowerups;
    byte m_killedBy;
    private String m_winningPlayerString;
    private int m_totalOpposingPlayingPlayers;
    public boolean m_bUpdateNetworkState;
    public int cycle;
    private int m_lastCycleForMessages;
    private int m_mode;
    static final int MODE_PLAYING = 0;
    static final int MODE_START_WAITING = 1;
    static final int MODE_WAITING = 2;
    static final int MODE_START_GAME_OVER = 3;
    static final int MODE_GAMEOVER = 4;
    private boolean m_bRefreshAll;
    boolean m_bRefreshPlayerBar;
    private static final int TEAM_LBL_HEIGHT = 18;
    private static final int TEAM_PLAYERS_OFFSET_Y = 52;
    private static final int NOVA_DUST_COUNT = 60;
    private static final int NOVA_INFO_COUNT = 6;
    private double[][] m_novaInfo;
    private static final int NOVA_DURATION = 0;
    private static final int NOVA_X = 1;
    private static final int NOVA_Y = 2;
    private static final int NOVA_DX = 3;
    private static final int NOVA_DY = 4;
    static final int MAX_MESSAGES = 2;
    Vector m_vMessages;
    int m_incomingSlot;
    int m_currentShade;
    int m_incomingIconCycle;
    int m_incomingIconIndex;
    private static final int MAX_INCOMING = 30;
    int m_incomingCycle;
    private static final int INCOMING_FRAMES = 40;
    byte[] m_incomingTypeStack;
    byte[] m_incomingWhoStack;
    boolean boardChanged;
    int m_portalVisibility;
    int m_offsetX;
    int m_offsetY;
    static final double maxDist = 180.0;
    int m_incomingNukeCycle;
    Color m_flashScreenColor;
    int m_wins;
    int m_kills;
    
    private void drawFighter(final Graphics graphics, final int n, final int n2, final int n3) {
        graphics.translate(n2, n3);
        if (this.hasShipPermission((byte)PlayerSprite.g_fighterData[n][13])) {
            graphics.setColor(Sprite.g_colors[super.m_slot][2]);
        }
        else {
            graphics.setColor(Color.black);
        }
        if (this.m_playerFighterType == n) {
            graphics.setColor(Sprite.g_colors[super.m_slot][this.m_currentFighterShade++ / 2 % 20]);
            graphics.fillRect(-25, -24, 50, 50);
            graphics.setColor(Color.gray);
            graphics.fillRect(-20, -20, 40, 40);
            graphics.setColor(this.m_color);
        }
        else {
            graphics.drawRect(-24, -24, 48, 48);
        }
        graphics.translate(0, (int)PlayerSprite.g_fighterData[n][0]);
        WHUtil.drawScaledPoly(graphics, PlayerSprite.g_polyShip[n][0], PlayerSprite.g_fighterData[n][1]);
        graphics.translate(0, -(int)PlayerSprite.g_fighterData[n][0]);
        if (PlayerSprite.g_fighterData[n][9] >= 1.0) {
            WHUtil.fillCenteredCircle(graphics, 0.0, 0.0, 5);
            graphics.setColor(Color.black);
            WHUtil.fillCenteredArc(graphics, 0.0, 0.0, 5, -20, 40);
        }
        graphics.translate(-n2, -n3);
    }
    
    private void drawTeamStuff(final Graphics graphics) {
        final byte b = (byte)(3 - this.m_teamID);
        final Color color = CFSkin.TEAM_COLORS[b];
        final Color color2 = CFSkin.TEAM_BG_COLORS[b];
        final String s = CFSkin.TEAM_NAMES[b];
        final int boardCenterX = this.m_boardCenterX;
        final int boardCenterX2 = this.m_boardCenterX;
        graphics.setColor(color);
        for (int i = 0; i < this.m_players.length; ++i) {
            final PortalSprite portalSprite = this.m_players[i].m_portalSprite;
            if (portalSprite != null && !portalSprite.shouldRemoveSelf && this.m_players[i].m_teamID != this.m_teamID && !this.m_players[i].m_bEmpty) {
                final double n = portalSprite.intx - boardCenterX;
                final double n2 = portalSprite.inty - boardCenterX2;
                for (int n3 = (int)(WormholeModel.gOrbitDistance / 35.0), j = 0; j < n3 - 1; ++j) {
                    final int n4 = boardCenterX + (int)(n / n3 * j);
                    final int n5 = boardCenterX2 + (int)(n2 / n3 * j);
                    graphics.setColor(CFSkin.TEAM_COLORS[b]);
                    if (b == 1) {
                        graphics.drawRect(n4, n5, 8, 8);
                    }
                    else {
                        graphics.drawOval(n4, n5, 9, 9);
                    }
                }
            }
        }
        if (this.m_player.getViewRect().intersects(this.m_rectCenterBox)) {
            int n6 = 0;
            do {
                if (this.m_novaInfo[n6][0] > 45.0) {
                    this.m_novaInfo[n6][0] = Math.abs(WHUtil.randInt(45));
                    this.m_novaInfo[n6][1] = boardCenterX - 5 + WHUtil.randInt(16);
                    this.m_novaInfo[n6][2] = boardCenterX2 - 5 + WHUtil.randInt(16);
                    this.m_novaInfo[n6][3] = ((Math.random() < 0.5) ? -1 : 1) * Math.random() * 4.0;
                    this.m_novaInfo[n6][4] = ((Math.random() < 0.5) ? -1 : 1) * Math.random() * 4.0;
                }
                final double[] array = this.m_novaInfo[n6];
                final int n7 = 1;
                array[n7] += this.m_novaInfo[n6][3];
                final double[] array2 = this.m_novaInfo[n6];
                final int n8 = 2;
                array2[n8] += this.m_novaInfo[n6][4];
                graphics.setColor(Sprite.g_colors[(this.m_teamID == 1) ? 10 : 0][(int)this.m_novaInfo[n6][0] / 3]);
                final int n9 = 11 - (int)(this.m_novaInfo[n6][0] / 4.0);
                if (b == 1) {
                    graphics.drawRect((int)this.m_novaInfo[n6][1], (int)this.m_novaInfo[n6][2], n9, n9);
                }
                else {
                    graphics.drawOval((int)this.m_novaInfo[n6][1], (int)this.m_novaInfo[n6][2], n9, n9);
                }
                final double[] array3 = this.m_novaInfo[n6];
                final int n10 = 0;
                ++array3[n10];
            } while (++n6 < 60);
        }
    }
    
    void drawCenteredString2(final Graphics graphics, final String s, final int n, final int n2, final int n3) {
        graphics.drawString(s, (n3 - graphics.getFontMetrics(graphics.getFont()).stringWidth(s)) / 2 + n2, n);
    }
    
    public void addPowerup(final int n) {
        if (this.m_numPowerups >= 5) {
            return;
        }
        this.m_powerups[this.m_numPowerups++] = n;
        this.refreshStatus = true;
        this.writeEvent("got the " + PowerupSprite.g_names[n] + " powerup");
    }
    
    public void setTeam(final String s, final byte b) {
        if (super.m_logic.getUsername().equals(s)) {
            this.m_teamID = b;
        }
        else {
            for (int i = 0; i < this.m_players.length; ++i) {
                if (this.m_players[i].m_username.equals(s)) {
                    this.m_players[i].m_teamID = b;
                }
                this.m_players[i].m_bRefresh = true;
            }
        }
        this.m_bRefreshPlayerBar = true;
    }
    
    private int drawTeam(final Graphics graphics, final int n, final int n2, final boolean b) {
        int n3 = n;
        for (int i = 0; i < this.m_players.length; ++i) {
            if (this.m_players[i].m_teamID == (byte)n2) {
                if (b || this.m_players[i].m_bRefresh) {
                    this.m_players[i].setDrawLocation(n3, this.m_playerHeight - 4);
                    graphics.translate(0, n3);
                    this.m_players[i].draw(graphics, 143, this.m_playerHeight - 4);
                    graphics.translate(0, -n3);
                }
                n3 += this.m_playerHeight - 3;
            }
        }
        return n3;
    }
    
    public void updatePlayerRank(final String s, final int n, final int rank) {
        final int n2 = rank - n;
        if (n2 >= 0) {
            super.m_logic.addLine("<" + s + "> gained +" + n2 + " point" + ((n2 > 1) ? "s!" : "!"));
        }
        else {
            super.m_logic.addLine("<" + s + "> lost " + n2 + " point" + ((-n2 > 1) ? "s!" : "!"));
        }
        for (int i = 0; i < this.m_players.length; ++i) {
            if (this.m_players[i].m_username.equals(s)) {
                this.m_players[i].m_rank = rank;
                this.m_players[i].m_bRefresh = true;
                this.m_bRefreshPlayerBar = true;
                return;
            }
        }
    }
    
    public void keyPressed(final KeyEvent keyEvent) {
        final int keyCode = keyEvent.getKeyCode();
        if (keyCode == KeyEvent.VK_UP || keyCode == KeyEvent.VK_W || keyCode == KeyEvent.VK_I || keyCode == KeyEvent.VK_NUMPAD8) {
            ++this.up;
            return;
        }
        if (keyCode == KeyEvent.VK_RIGHT || keyCode == KeyEvent.VK_D || keyCode == KeyEvent.VK_L || keyCode == KeyEvent.VK_NUMPAD6) {
            ++this.right;
            return;
        }
        if (keyCode == KeyEvent.VK_LEFT || keyCode == KeyEvent.VK_A || keyCode == KeyEvent.VK_J || keyCode == KeyEvent.VK_NUMPAD4) {
            ++this.left;
            return;
        }
        if  (keyCode == KeyEvent.VK_SPACE || keyCode == KeyEvent.VK_NUMPAD0) {
            ++this.fire;
            return;
        }
        if (keyCode == KeyEvent.VK_F || keyCode == KeyEvent.VK_NUMPAD3) {
            ++this.secondaryFire;
            return;
        }
        if (keyCode == KeyEvent.VK_R) {
            ++this.tertiaryFire;
            return;
        }
        if (keyCode == KeyEvent.VK_Q) {
            this.m_player.shouldRemoveSelf = true;
        }  
    }
    
    public void mouseReleased(final MouseEvent mouseEvent) {
        final int x = mouseEvent.getX();
        final int y = mouseEvent.getY();
        if (mouseEvent.getSource() == this.m_pnlOtherPlayers) {
            if (super.m_tableElement.isTeamTable() && this.m_changeTeamsRect.contains(x, y) && super.m_tableElement.getStatus() == TableStatus.IDLE) {
                super.m_logic.getNetwork().changeTeams((byte)(3 - this.m_teamID));
                return;
            }
            if (y >= 52) {
                for (int i = 0; i < this.m_players.length; ++i) {
                    if (!this.m_players[i].m_bEmpty && this.m_players[i].containsClick(y)) {
                        super.m_logic.openDialogForPlayer(this.m_players[i].m_username);
                    }
                }
            }
        }
        else if (this.gameOver && x >= this.m_intro_shipX && x < this.m_intro_shipX + 400 && y >= this.m_intro_shipY && y < this.m_intro_shipY + 50) {
            final int describedShip = (y - this.m_intro_shipY) / 50 * 8 + (x - 5 - this.m_introX) / 50;
            if (describedShip < 0 || describedShip > 7) {
                return;
            }
            this.m_describedShip = describedShip;
            this.m_zoomInIntro = 0.0;
            if (this.hasShipPermission((byte)PlayerSprite.g_fighterData[this.m_describedShip][13])) {
                this.m_playerFighterType = this.m_describedShip;
            }
        }
    }
    
    public void handleGamePacket(final DataInput dataInput) throws IOException {
        switch (dataInput.readByte()) {
            case 100: {
                WormholeModel.m_gameID = dataInput.readShort();
                this.m_gameSession = dataInput.readShort();
                this.setPlayers(dataInput, false);
                this.m_totalOpposingPlayingPlayers = 0;
                for (int i = 0; i < this.m_players.length; ++i) {
                    if (!this.m_players[i].m_bEmpty) {
                        if (super.m_tableElement.isTeamTable()) {
                            if (this.m_players[i].m_teamID != this.m_teamID) {
                                ++this.m_totalOpposingPlayingPlayers;
                            }
                        }
                        else {
                            ++this.m_totalOpposingPlayingPlayers;
                        }
                    }
                }
                this.init();
                this.m_mode = 0;
                this.m_bRefreshPlayerBar = true;
                this.m_bRefreshAll = true;
                this.gameOver = false;
                this.m_pnlPlaying.requestFocus();
                int n = 0;
                for (int j = 0; j < this.m_players.length; ++j) {
                    if (!this.m_players[j].m_bEmpty) {
                        boolean b = false;
                        if (super.m_tableElement.isTeamTable()) {
                            if (this.m_players[j].m_teamID != this.m_teamID) {
                                b = true;
                            }
                        }
                        else {
                            b = true;
                        }
                        if (b) {
                            final PortalSprite portalSprite = new PortalSprite((int)(n++ * (360.0 / this.m_totalOpposingPlayingPlayers)), this.m_players[j]);
                            (this.m_players[j].m_portalSprite = portalSprite).addSelf();
                            portalSprite.setWarpingIn();
                        }
                        else {
                            this.m_players[j].m_portalSprite = null;
                        }
                    }
                }
                break;
            }
            case 106: {
                if (dataInput.readShort() != this.m_gameSession && !this.gameOver) {
                    return;
                }
                final byte slot = dataInput.readByte();
                if (slot == super.m_slot) {
                    return;
                }

                final PlayerInfo playerInfo = this.m_players[this.translateSlot(slot)];
                if (playerInfo.m_gameOver || playerInfo.m_bEmpty) {
                    return;
                }
                playerInfo.readState(dataInput);
                this.m_bRefreshPlayerBar = true;
                break;
            }
            case 111: {
                final byte slot = dataInput.readByte();
                if (super.m_slot == slot) {
                    this.m_winningPlayerString = "YOU WON";
                    ++this.m_wins;
                }
                else {
                    final byte translateSlot = this.translateSlot(slot);
                    this.m_winningPlayerString = this.m_players[translateSlot].m_username + " WON";
                    final PlayerInfo playerInfo2 = this.m_players[translateSlot];
                    ++playerInfo2.m_wins;
                    this.m_players[translateSlot].m_gameOver = true;
                }
                this.gameOver = true;
                this.refreshStatus = true;
                this.m_bRefreshPlayerBar = true;
                break;
            }
            case 112: {
                final byte teamId = dataInput.readByte();
                this.m_winningPlayerString = CFSkin.TEAM_NAMES[teamId] + " WON";
                if (this.m_teamID == teamId) {
                    ++this.m_wins;
                }
                else {
                    for (int k = 0; k < this.m_players.length; ++k) {
                        if (this.m_players[k].m_teamID == teamId) {
                            final PlayerInfo playerInfo3 = this.m_players[k];
                            ++playerInfo3.m_wins;
                            this.m_players[k].m_gameOver = true;
                        }
                    }
                }
                this.gameOver = true;
                this.refreshStatus = true;
                this.m_bRefreshPlayerBar = true;
                break;
            }
            case 110: {
                final byte deceasedSlot = dataInput.readByte();
                final byte killerSlot = dataInput.readByte();
                if (deceasedSlot == super.m_slot) {
                    this.gameOver = true;
                    return;
                }
                final PlayerInfo playerInfo4 = this.m_players[this.translateSlot(deceasedSlot)];
                playerInfo4.m_gameOver = true;
                playerInfo4.m_bRefresh = true;
                if (playerInfo4.m_portalSprite != null) {
                    playerInfo4.m_portalSprite.killSelf();
                }
                playerInfo4.m_healthPercentage = 0;
                if (killerSlot == super.m_slot) {
                    ++this.m_kills;
                    this.refreshStatus = true;
                }
                this.m_bRefreshPlayerBar = true;
                break;
            }
            case 109: {
                final String utf = dataInput.readUTF();
                while (this.m_vMessages.size() >= 2) {
                    this.m_vMessages.removeElementAt(0);
                }
                this.m_vMessages.addElement(utf);
                this.m_lastCycleForMessages = this.cycle + 200;
                break;
            }
            case 107: {
                final byte powerupType = dataInput.readByte();
                final byte fromSlot = dataInput.readByte();
                final byte toSlot = dataInput.readByte();
                final short gameSession = dataInput.readShort();
                final byte byte9 = dataInput.readByte();
                if (gameSession != this.m_gameSession && !this.gameOver) {
                    return;
                }
                final byte translateSlot2 = this.translateSlot(fromSlot);
                if (fromSlot != super.m_slot && translateSlot2 < 0) {
                    return;
                }
                if (toSlot != super.m_slot) {
                    this.m_bRefreshPlayerBar = true;
                    return;
                }
                if (this.gameOver) {
                    return;
                }
                this.addIncomingPowerup(this.m_players[translateSlot2].m_portalSprite, powerupType, fromSlot, byte9);
                break;
            }
            case 120: {
            	short numPlayers = dataInput.readShort();
            	for (int i=0; i<numPlayers; i++) {
            		byte slot = dataInput.readByte();
            		short winCount	= dataInput.readShort();
            		
            		byte translateSlot = this.translateSlot(slot);
                    PlayerInfo playerInfo = this.m_players[translateSlot];
                    playerInfo.m_wins = winCount;                    
                    this.refreshStatus = true;
            	}
            	break;
            }
            case 121: {
            	byte slot = dataInput.readByte();
            	byte teamId = dataInput.readByte();
            	if (slot == super.m_slot) {
            		this.m_teamID = teamId;
            	}
            	else {
                	byte translateSlot = this.translateSlot(slot);
            		PlayerInfo playerInfo = this.m_players[translateSlot];
            		playerInfo.m_teamID = teamId;
            		playerInfo.m_bRefresh = true;
            	}
            	this.m_bRefreshPlayerBar = true;
            	break;
            }
            default: {}
        }
    }
    
    void drawCenteredString(final Graphics graphics, final String s, final int n, final int n2) {
        if (this.m_fm == null) {
            this.m_fm = graphics.getFontMetrics(WormholeModel.fontLarge);
        }
        final int n3 = (this.boardWidth - this.m_fm.stringWidth(s)) / 2 + n2;
        graphics.setFont(WormholeModel.fontLarge);
        graphics.drawString(s, n3, n);
    }
    
    public void doOneCycle() {
        //GameBoard.playSound((Clip)WormholeModel.g_mediaTable.get("snd_silence"));
        switch (this.m_mode) {
            case 0: {
                this.handleDefaultModelBehavior();
                if (!this.gameOver) {
                    break;
                }
                super.m_logic.gameOver();
                this.m_mode = 3;
                if (this.m_winningPlayerString == null) {
                    this.gameOver(this.m_gameSession, this.m_killedBy, WormholeModel.m_gameID);
                    return;
                }
                break;
            }
            case 1: {
                this.gameOver = true;
                this.m_mode = 2;
                this.drawStatusBar(this.m_pnlStatus.m_g);
                this.m_pnlStatus.completeRepaint();
                this.m_bRefreshPlayerBar = true;
                break;
            }
            case 2: {
                this.checkSidebar();
                if (this.m_bRefreshPlayerBar) {
                    this.drawPlayerBar(this.m_pnlOtherPlayers.m_g, true);
                    this.m_pnlOtherPlayers.completeRepaint();
                }
                this.draw(this.m_pnlPlaying.m_g);
                this.drawIntro(this.m_pnlPlaying.m_g);
                if (super.m_tableElement.getStatus() == 4) {
                    this.drawStrings(this.m_pnlPlaying.m_g, "Waiting for", "Next Game");
                    this.m_pnlPlaying.completeRepaint();
                }
                else if (super.m_tableElement.getStatus() == 3) {
                    this.drawStrings(this.m_pnlPlaying.m_g, "Countdown", "" + super.m_tableElement.getCountdown());
                }
                else if (super.m_tableElement.getStatus() == 5 && this.m_winningPlayerString != null) {
                    // nothing to do for now
                }
                else if (super.m_tableElement.getNumPlayers() < 2) {
                    this.drawStrings(this.m_pnlPlaying.m_g, "Waiting for", "More Players");
                }
                else {
                	this.m_winningPlayerString = null;
                    this.drawStrings(this.m_pnlPlaying.m_g, "Press Play Button", "To Start");
                }
                this.m_pnlPlaying.completeRepaint();
                break;
            }
            case 3: {
                this.m_gameOverCycle = 0;
                this.m_mode = 4;
                break;
            }
            case 4: {
                this.handleDefaultModelBehavior();
                if (this.m_gameOverCycle++ > 120 || this.m_winningPlayerString != null) {
                    this.m_mode = 1;
                    return;
                }
                break;
            }
        }
    }
    
    public int getSleepTime() {
        return 15;
    }
    
    public void removePlayer(final String s) {
        for (int i = 0; i < this.m_players.length; ++i) {
            if (this.m_players[i].m_username.equals(s)) {
                this.m_bRefreshPlayerBar = true;
                this.m_players[i].fullReset();
            }
        }
        if (super.m_tableElement.isTeamTable()) {
            this.m_bRefreshAll = true;
        }
    }
    
    private void checkSidebar() {
        for (int i = 0; i < this.m_players.length; ++i) {
            if (this.m_players[i].timeoutAttacks()) {
                this.m_bRefreshPlayerBar = true;
            }
        }
    }
    
    public void setSlot(final int slot) {
        super.setSlot(slot);
        this.m_color = Sprite.g_colors[super.m_slot][0];
    }
    
    void drawTeamButton(final Graphics graphics, final String s, final Color color, final Color color2, final int n, final int n2, final int n3, final int n4) {
        graphics.setColor(color);
        graphics.fillRoundRect(n + 1, n2, n4 - 2 - n, 15, n3, n3);
        graphics.setColor(color2);
        graphics.drawRoundRect(n + 1, n2, n4 - 2 - n, 15, n3, n3);
        graphics.setFont(WormholeModel.fontTwelve);
        this.drawCenteredString2(graphics, s, n2 + 13, n, n4 - n);
    }
    
    public void paintParent(final Graphics graphics) {
    }
    
    void writeState(final DataOutput dataOutput) throws IOException {
    	int heathPerc = (int)(this.m_player.m_health*1.0 / this.m_player.MAX_HEALTH * 100.0);
        dataOutput.writeShort(heathPerc);
        dataOutput.writeByte(this.m_numPowerups);
        for (int i = 0; i < this.m_numPowerups; ++i) {
            dataOutput.writeByte(this.m_powerups[i]);
        }
        dataOutput.writeByte((byte)this.m_playerFighterType);
        if (this.m_strDamagedByPlayer == null) {
            dataOutput.writeByte(0);
            return;
        }
        dataOutput.writeByte(1);
        dataOutput.writeUTF(this.m_strDamagedByPlayer);
        dataOutput.writeByte((byte)this.m_damagingPowerup);
        dataOutput.writeByte((byte)this.m_player.m_lostHealth);
    }
    
    void clearScreen() {
        this.m_flashScreenColor = Color.white;
        for (int i = 0; i < this.badGuys.maxElement; ++i) {
            final Sprite sprite = this.badGuys.sprites[i];
            if (sprite != null && sprite.m_bInDrawingRect && (!sprite.indestructible || sprite.m_bZappable)) {
                sprite.killSelf();
            }
        }
    }
    
    public void updateState(final short gameSession, final int gameId) {
        synchronized (super.m_logic.getNetwork()) {
            final DataOutput stream = super.m_logic.getNetwork().getStream(gameId);
            try {
                stream.writeByte(106);
                stream.writeShort(gameSession);
                this.writeState(stream);
                super.m_logic.getNetwork().sendPacket();
            }
            catch (Exception ex) {}
        }
        // monitorexit(super.m_logic.getNetwork())
    }
    
    public void gameOver(final short gameSession, final byte killedBy, final short gameId) {
        synchronized (super.m_logic.getNetwork()) {
            final DataOutput stream = super.m_logic.getNetwork().getStream(gameId);
            try {
                stream.writeByte(110);
                stream.writeShort(gameSession);
                stream.writeByte(killedBy);
                super.m_logic.getNetwork().sendPacket();
            }
            catch (Exception ex) {}
        }
        // monitorexit(super.m_logic.getNetwork())
    }
    
    void drawPlayerBar(final Graphics graphics, final boolean b) {
        this.m_bRefreshPlayerBar = false;
        if (b) {
            graphics.setColor(this.m_pnlOtherPlayers.getBackground());
            graphics.fillRect(0, 0, 144, 474);
        }
        if (!super.m_tableElement.isTeamTable()) {
            for (int i = 0; i < this.m_players.length; ++i) {
                if (b || this.m_players[i].m_bRefresh) {
                    final int n = 49 + this.m_playerHeight * i;
                    this.m_players[i].setDrawLocation(n, this.m_playerHeight - 1);
                    graphics.translate(0, n);
                    this.m_players[i].draw(graphics, 143, this.m_playerHeight - 1);
                    graphics.translate(0, -n);
                }
            }
            return;
        }
        if (this.m_teamID <= 0) {
            return;
        }
        if (b) {
            this.drawTeamButton(graphics, CFSkin.TEAM_NAMES[this.m_teamID], CFSkin.TEAM_COLORS[this.m_teamID], CFSkin.TEAM_BG_COLORS[this.m_teamID], 0, 1, 3, 144);
        }
        if (b) {
            this.drawMyTeamPlaceholder(graphics, 18);
        }
        final int drawTeam = this.drawTeam(graphics, 52, this.m_teamID, b);
        final byte b2 = (byte)(3 - this.m_teamID);
        if (b) {
            this.drawTeamButton(graphics, CFSkin.TEAM_NAMES[b2], CFSkin.TEAM_COLORS[b2], CFSkin.TEAM_BG_COLORS[b2], 0, drawTeam, 3, 144);
        }
        this.drawTeam(graphics, drawTeam + 18, b2, b);
    }
    
    void drawStatusBar(final Graphics graphics) {
        if (this.gameOver) {
            graphics.setColor(Color.gray);
        }
        else {
            graphics.setColor(Color.black);
        }
        graphics.fillRect(0, 0, 430, 49);
        graphics.setColor(this.m_color);
        graphics.drawRect(0, 0, 429, 48);
        graphics.setFont(WormholeModel.fontTwelve);
        if (this.m_player != null) {
            graphics.setColor(Color.white);
            graphics.drawString(super.m_logic.getUsername(), 7, 10);
            graphics.setColor(this.m_color);
            final int n = 19;
            graphics.drawRoundRect(-20, n, 144, n + 50, 20, 20);
            graphics.drawString("Powerups", 7, n + 12);
            if (this.m_numPowerups > 0) {
                graphics.translate(5, n + 14);
                this.drawPowerups(graphics);
                graphics.translate(-5, -n - 14);
                graphics.setColor(this.m_color);
            }
            graphics.translate(110, 0);
            this.m_player.drawPermanentPowerups(graphics);
            graphics.translate(-110, 0);
        }
        final int n2 = 370;
        final int n3 = n2 - 10;
        graphics.setColor(this.m_color);
        graphics.drawLine(n3, 0, n3, 90);
        graphics.drawString("History", n2, 12);
        graphics.drawString("Wins: " + this.m_wins, n2, 28);
        graphics.drawString("Kills: " + this.m_kills, n2, 42);
        this.refreshStatus = false;
    }
    
    void doCollisions() {
        for (int i = 0; i <= this.badGuys.maxElement; ++i) {
            final Sprite collided = this.badGuys.sprites[i];
            if (collided != null) {
                for (int j = 0; j <= this.goodGuys.maxElement; ++j) {
                    final Sprite collided2 = this.goodGuys.sprites[j];
                    if (collided2 != null && !collided.hasCollided && !collided2.hasCollided && collided.isCollision(collided2)) {
                        collided2.setCollided(collided);
                        collided.setCollided(collided2);
                    }
                }
            }
        }
    }
    
    private void setPlayers(final DataInput dataInput, final boolean b) throws IOException {
        for (short short1 = dataInput.readShort(), n = 0; n < short1; ++n) {
            final String utf = dataInput.readUTF();
            final byte byte1 = dataInput.readByte();
            final byte byte2 = dataInput.readByte();
            final byte byte3 = dataInput.readByte();
            if (!utf.equals(super.m_logic.getUsername())) {
                this.setPlayer(utf, super.m_logic.getPlayerRank(utf), byte3, super.m_logic.getPlayer(utf).getIcons(), byte1, byte2 == 0, b);
                if (byte2 == 0) {}
            }
            else {
                super.m_slot = byte1;
                this.m_color = Sprite.g_colors[super.m_slot][0];
                this.m_teamID = byte3;
            }
        }
        this.m_bRefreshPlayerBar = true;
    }
    
    public void doPlayCycle() {
        ++this.cycle;
        this.doBehavior();
        this.doCollisions();
        this.checkSidebar();
    }
    
    public void setTable(final CFTableElement table) {
        super.setTable(table);
        if (table.isTeamTable()) {
            this.m_teamID = 1;
        }
        else {
            this.m_teamID = 0;
        }
        this.init();
        if (!this.hasShipPermission((byte)PlayerSprite.g_fighterData[this.m_playerFighterType][13])) {
            this.m_playerFighterType = 1;
        }
        this.drawPlayerBar(this.m_pnlOtherPlayers.m_g, true);
        this.m_mode = 1;
    }
    
    public void drawEnemyTeamShape(final Graphics graphics, final int n, final int n2) {
        if (this.m_teamID != 0) {
            PlayerInfo.drawTeamShape(graphics, n, n2, 3 - this.m_teamID);
        }
    }
    
    void setPlayer(final String s, final int rank, final byte teamID, final String[] icons, final byte b, final boolean gameOver, final boolean b2) {
        final PlayerInfo playerInfo = this.m_players[this.translateSlot(b)];
        playerInfo.reset();
        playerInfo.resetPowerups();
        playerInfo.setState(s, b);
        playerInfo.m_gameOver = gameOver;
        playerInfo.m_nPowerups = 0;
        playerInfo.m_rank = rank;
        playerInfo.m_icons = icons;
        playerInfo.m_teamID = teamID;
        this.m_bRefreshPlayerBar = true;
    }
    
    String getPlayer(final byte b) {
        if (b > this.m_players.length) {
            return "COMPUTER";
        }
        if (b == super.m_slot) {
            return "YOU";
        }
        return this.m_players[this.translateSlot(b)].m_username;
    }
    
    private boolean hasShipPermission(final byte b) {
    	if (super.m_tableElement.allShipsAllowed()) {
    		return true;
    	}
    	
        byte b2 = 2;
        switch (b) {
            case 10: {
                return true;
            }
            case 0:
            case 1: {
                if (super.m_logic.getSubscriptionLevel() <= -1) {
                    return true;
                }
                break;
            }
            case 11:
            case 12: {
                b2 = 1;
                break;
            }
        }
        return super.m_logic.getSubscriptionLevel() >= b2;
    }
    
    public void reset() {
        super.reset();
        this.init();
        this.m_wins = 0;
        super.m_slot = 0;
        this.m_color = Sprite.g_colors[0][0];
        this.m_bRefreshPlayerBar = true;
        for (int i = 0; i < this.m_players.length; ++i) {
            this.m_players[i].fullReset();
        }
    }
    
    void drawGrid(final Graphics graphics) {
        final Rectangle viewRect = this.m_player.getViewRect();
        graphics.setColor(Color.white);
        graphics.translate(viewRect.x, viewRect.y);
        this.drawStars(graphics, Color.gray, this.m_narrowStarX, this.m_narrowStarY, false);
        this.drawPointers(graphics);
        graphics.translate(-viewRect.x, -viewRect.y);
        this.drawStars(graphics, Color.white, this.m_starX, this.m_starY, true);
        this.drawRing(graphics);
        if (this.m_teamID != 0 && super.m_tableElement.isTeamTable() && !this.gameOver) {
            this.drawTeamStuff(graphics);
        }
        if (this.m_imgLogo != null && viewRect.intersects(this.m_rectLogo)) {
            graphics.drawImage(this.m_imgLogo, this.m_rectLogo.x, this.m_rectLogo.y, null);
        }
    }
    
    private void drawRing(final Graphics graphics) {
        graphics.setColor(Color.gray);
        WHUtil.drawCenteredCircle(graphics, this.m_boardCenterX, this.m_boardCenterY, WormholeModel.gOrbitDistance);
    }
    
    public WormholeModel(final GameBoard gameBoard, final GameNetLogic gameNetLogic, final CFProps cfProps, final Hashtable g_mediaTable) {
        super(gameBoard, gameNetLogic, cfProps, g_mediaTable);
        this.m_rectLogo = new Rectangle();
        this.badGuys = new SpriteArray(100);
        this.goodGuys = new SpriteArray(100);
        this.allSprites = new SpriteArray(270);
        this.m_players = new PlayerInfo[7];
        this.m_starX = new int[70];
        this.m_starY = new int[70];
        this.m_starSize = new int[70];
        this.m_narrowStarX = new int[70];
        this.m_narrowStarY = new int[70];
        this.m_playerFighterType = 1;
        this.m_describedShip = 1;
        this.m_changeTeamsRect = new Rectangle(30, 33, 144, 18);
        this.m_borderShades = new Color[6];
        this.m_powerups = new int[5];
        this.m_mode = 1;
        this.m_novaInfo = new double[60][6];
        this.m_vMessages = new Vector();
        this.m_incomingTypeStack = new byte[40];
        this.m_incomingWhoStack = new byte[40];
        this.boardChanged = true;
        WormholeModel.g_mediaTable = g_mediaTable;
        this.boardWidth = gboardWidth;
        this.boardHeight = gboardHeight;
        for (int i = 0; i < this.m_players.length; ++i) {
            this.m_players[i] = new PlayerInfo();
        }
        Sprite.initColors();
        HeatSeekerMissile.initClass();
        Sprite.model = this;
        this.m_playerHeight = 60;
        int n = 0;
        do {
            this.m_novaInfo[n][0] = 0.0;
        } while (++n < 60);
        this.init();
        final Rectangle bounds = new Rectangle();
        gameBoard.setLayout(null);
        this.m_pnlStatus = new ImagePanel();
        bounds.setBounds(100, 0, 430, 49);
        this.m_pnlStatus.setBounds(bounds);
        this.m_pnlPlaying = new ImagePanel();
        bounds.setBounds(0, 49, this.boardWidth, this.boardHeight);
        this.m_pnlPlaying.setBounds(bounds);
        this.m_pnlOtherPlayers = new ImagePanel();
        bounds.setBounds(this.boardWidth, 0, 144, 474);
        this.m_pnlOtherPlayers.setBounds(bounds);
        this.m_pnlStatus.m_g.setColor(Color.green);
        this.m_pnlStatus.m_g.drawRect(0, 0, 429, 48);
        this.m_pnlPlaying.m_g.setColor(Color.green);
        this.m_pnlPlaying.m_g.drawRect(0, 0, this.boardWidth - 1, this.boardHeight - 1);
        gameBoard.add(this.m_pnlOtherPlayers);
        gameBoard.add(this.m_pnlStatus);
        gameBoard.add(this.m_pnlPlaying);
        this.m_pnlPlaying.addKeyListener(this);
        this.m_pnlPlaying.addMouseListener(this);
        this.m_pnlOtherPlayers.addMouseListener(this);
        this.m_introX = (this.boardWidth - 410) / 2;
        this.m_introY = this.boardHeight - 260 - 10;
        this.m_intro_shipX = this.m_introX + 5;
        this.m_intro_shipY = this.m_introY + 40;
    }
    
    public void readJoin(final DataInput dataInput) throws IOException {
        this.setPlayers(dataInput, true);
    }
    
    public void writeEvent(final String s) {
        this.updateEvent(super.m_logic.getUsername() + " " + s, this.m_gameSession, WormholeModel.m_gameID);
    }
    
    void draw(final Graphics graphics) {
        if (this.m_player != null) {
            final Rectangle viewRect = this.m_player.getViewRect();
            graphics.translate(-viewRect.x, -viewRect.y);
            graphics.setColor(this.m_flashScreenColor);
            this.m_flashScreenColor = Color.black;
            graphics.fillRect(-300, -300, this.totalBoardW + 600, this.totalBoardH + 600);
            for (int i = 0; i < this.m_borderShades.length; ++i) {
                graphics.setColor(this.m_borderShades[i]);
                graphics.drawRect(-i, -i, this.totalBoardW + i * 2, this.totalBoardH + i * 2);
            }
            this.drawGrid(graphics);
            graphics.translate(viewRect.x, viewRect.y);
            if (this.m_incomingCycle > 0) {
                --this.m_incomingCycle;
                graphics.setFont(WormholeModel.fontSuperLarge);
                graphics.setColor(Sprite.g_colors[this.m_incomingSlot][this.m_currentShade++ % 20]);
                graphics.drawString("I N C O M I N G", this.boardWidth / 2 - 120, 200);
                if (this.m_incomingNukeCycle > 0) {
                    --this.m_incomingNukeCycle;
                    graphics.drawString("N U K E", this.boardWidth / 2 - 90, 240);
                }
            }
            graphics.translate(-viewRect.x, -viewRect.y);
            for (int j = 0; j <= this.allSprites.maxElement; ++j) {
                final Sprite sprite = this.allSprites.sprites[j];
                if (sprite != null) {
                    sprite.m_bInDrawingRect = sprite.inViewingRect(viewRect);
                    if (sprite.m_bInDrawingRect) {
                        sprite.drawSelf(graphics);
                    }
                }
            }
            graphics.translate(viewRect.x, viewRect.y);
            if (this.m_incomingIconCycle > 0) {
                --this.m_incomingIconCycle;
            }
            else if (this.m_incomingIconIndex > 0) {
                --this.m_incomingIconIndex;
                this.m_incomingIconCycle = 50;
                for (int k = 0; k < this.m_incomingIconIndex; ++k) {
                    this.m_incomingTypeStack[k] = this.m_incomingTypeStack[k + 1];
                    this.m_incomingWhoStack[k] = this.m_incomingWhoStack[k + 1];
                }
            }
            for (int l = 0; l < this.m_incomingIconIndex; ++l) {
                graphics.drawImage(getImages("img_smallpowerups")[PowerupSprite.convertToSmallImage(this.m_incomingTypeStack[l])], 2, l * 15 + 31, null);
                Sprite.drawFlag(graphics, Sprite.g_colors[this.m_incomingWhoStack[l]][0], 25, l * 15 + 31);
            }
            if (this.m_winningPlayerString != null) {
                this.drawShadowString(graphics, "GAME OVER!", 100, 100);
                this.drawShadowString(graphics, "WINNER: " + this.m_winningPlayerString, 100, 120);
            }
            graphics.setColor(Color.white);
            graphics.setFont(WormholeModel.fontTwelve);
            for (int n = 0; n < this.m_vMessages.size(); ++n) {
                graphics.drawString((String)this.m_vMessages.elementAt(n), 10, 10 * (n + 1));
            }
        }
        if (this.m_teamID != 0) {
            graphics.setFont(WormholeModel.fontTwelve);
            graphics.setColor(CFSkin.TEAM_COLORS[this.m_teamID]);
            graphics.drawString(CFSkin.TEAM_NAMES[this.m_teamID] + " member", this.boardWidth - 135, 13);
        }
        graphics.setColor(Color.white);
        graphics.drawRect(0, 0, this.boardWidth - 1, this.boardHeight - 1);
    }
    
    public void updateEvent(final String eventString, final short gameSession, final int n2) {
        synchronized (super.m_logic.getNetwork()) {
            final DataOutput stream = super.m_logic.getNetwork().getStream(n2);
            try {
                stream.writeByte(109);
                stream.writeShort(gameSession);
                stream.writeUTF(eventString);
                super.m_logic.getNetwork().sendPacket();
            }
            catch (Exception ex) {}
        }
        // monitorexit(super.m_logic.getNetwork())
    }
    
    public void drawTeamShape(final Graphics graphics, final int n, final int n2) {
        if (this.m_teamID != 0) {
            PlayerInfo.drawTeamShape(graphics, n, n2, this.m_teamID);
        }
    }
    
    public void keyReleased(final KeyEvent keyEvent) {
        final int keyCode = keyEvent.getKeyCode();
        if (keyCode == KeyEvent.VK_UP || keyCode == KeyEvent.VK_W || keyCode == KeyEvent.VK_I || keyCode == KeyEvent.VK_NUMPAD8) {
            this.up = 0;
            return;
        }
        if (keyCode == KeyEvent.VK_RIGHT || keyCode == KeyEvent.VK_D || keyCode == KeyEvent.VK_L || keyCode == KeyEvent.VK_NUMPAD6) {
            this.right = 0;
            return;
        }
        if (keyCode == KeyEvent.VK_LEFT || keyCode == KeyEvent.VK_A || keyCode == KeyEvent.VK_J || keyCode == KeyEvent.VK_NUMPAD4) {
            this.left = 0;
            return;
        }
        if (keyCode == KeyEvent.VK_SPACE || keyCode == KeyEvent.VK_NUMPAD0) {
            this.fire = 0;
            return;
        }
        if (keyCode == KeyEvent.VK_F || keyCode == KeyEvent.VK_NUMPAD3) {
            this.secondaryFire = 0;
            return;
        }
        if (keyCode == KeyEvent.VK_R) {
            this.tertiaryFire = 0;
        }
    }
    
    private void handleDefaultModelBehavior() {
        this.doPlayCycle();
        this.draw(this.m_pnlPlaying.m_g);
        this.m_pnlPlaying.completeRepaint();
        if (this.refreshStatus) {
            this.drawStatusBar(this.m_pnlStatus.m_g);
            this.m_pnlStatus.completeRepaint();
            this.updateState(this.m_gameSession, WormholeModel.m_gameID);
            this.m_strDamagedByPlayer = null;
            this.m_damagingPowerup = -1;
        }
        if (this.m_bRefreshPlayerBar) {
            this.drawPlayerBar(this.m_pnlOtherPlayers.m_g, this.m_bRefreshAll);
            this.m_pnlOtherPlayers.completeRepaint();
            this.m_bRefreshAll = false;
        }
    }
    
    private void drawPointers(final Graphics graphics) {
        for (int i = 0; i < this.m_players.length; ++i) {
            if (!this.m_players[i].m_bEmpty && this.m_players[i].m_portalSprite != null && this.m_player != null && !this.m_players[i].m_gameOver) {
                final double n = this.m_players[i].m_portalSprite.x - this.m_player.x;
                final double n2 = this.m_players[i].m_portalSprite.y - this.m_player.y;
                final double hyp = WHUtil.hyp(n, n2);
                if (hyp >= this.m_portalVisibility) {
                    final double n3 = 180.0 * n / hyp;
                    final double n4 = 180.0 * n2 / hyp;
                    final double n5 = n3 + this.m_offsetX;
                    final double n6 = n4 + this.m_offsetY;
                    graphics.setColor(this.m_players[i].m_color);
                    final double atan = Math.atan(n2 / n);
                    double n7 = 171.0;
                    if (n < 0.0) {
                        n7 = -n7;
                    }
                    final double n8 = atan + 0.04;
                    final double n9 = atan - 0.04;
                    final int n10 = (int)(n7 * Math.cos(n8)) + this.m_offsetX;
                    final int n11 = (int)(n7 * Math.sin(n8)) + this.m_offsetY;
                    final int n12 = (int)(n7 * Math.cos(n9)) + this.m_offsetX;
                    final int n13 = (int)(n7 * Math.sin(n9)) + this.m_offsetY;
                    graphics.drawLine((int)n5, (int)n6, (int)(n3 * 0.9) + this.m_offsetX, (int)(n4 * 0.9) + this.m_offsetY);
                    graphics.drawLine((int)n5, (int)n6, n10, n11);
                    graphics.drawLine((int)n5, (int)n6, n12, n13);
                    graphics.drawLine(n12, n13, n10, n11);
                }
            }
        }
    }
    
    private void drawShadowString(final Graphics graphics, final String s, final int n, final int n2) {
        graphics.setFont(WormholeModel.fontLarge);
        graphics.setColor(Color.black);
        graphics.drawString(s, n + 2, n2 + 2);
        graphics.setColor(Color.white);
        graphics.drawString(s, n, n2);
    }
    
    static {
        fontSuperLarge = new Font("Helvetica", 1, 40);
        fontLarge = new Font("Helvetica", 0, 20);
        fontFourteen = new Font("Helvetica", 1, 14);
        fontTwelve = new Font("Helvetica", 1, 12);
        g_titleColor = Color.green;
        WormholeModel.gOrbitDistance = 270;
    }
    
    public void addPlayer(final String s, final int n, final byte b, final String[] array, final int n2) {
        if (!s.equals(super.m_logic.getUsername())) {
            this.setPlayer(s, n, b, array, (byte)n2, true, true);
        }
        if (super.m_tableElement.isTeamTable()) {
            this.m_bRefreshAll = true;
        }
    }
    
    void drawMyTeamPlaceholder(final Graphics graphics, final int n) {
        if (!this.gameOver) {
            graphics.setColor(Color.black);
            graphics.fillRect(0, n, 143, 31);
        }
        this.drawTeamButton(graphics, "Switch Teams", Color.gray, Color.white, 30, n + 13, 10, 134);
        graphics.setColor(this.m_color);
        graphics.drawRect(0, n, 143, 31);
        graphics.drawString(super.m_logic.getUsername(), 30, n + 11);
        graphics.translate(15, n + 18);
        WHUtil.drawPoly(graphics, PlayerSprite.g_polyShip[this.m_playerFighterType][0]);
        graphics.translate(-15, -(n + 18));
        this.drawTeamShape(graphics, 1, n + 1);
    }
    
    byte translateSlot(final byte b) {
        if (super.m_slot < b) {
            return (byte)(b - 1);
        }
        return b;
    }
    
    public static Image[] getImages(final String s) {
        return (Image[])WormholeModel.g_mediaTable.get(s);
    }
    
    void addIncomingPowerup(final PortalSprite portalSprite, final byte powerupType, final byte incomingSlot, final byte b2) {
        if (portalSprite == null) {
            return;
        }
        portalSprite.genBadPowerupEffect(powerupType, incomingSlot, b2);
        this.m_incomingCycle = 40;
        this.m_incomingIconCycle = 160;
        this.m_incomingWhoStack[this.m_incomingIconIndex] = incomingSlot;
        this.m_incomingSlot = incomingSlot;
        this.m_currentShade = 0;
        this.m_incomingTypeStack[this.m_incomingIconIndex] = powerupType;
        this.m_incomingIconIndex = Math.min(29, this.m_incomingIconIndex + 1);
        if (powerupType == 14) {
            this.m_incomingNukeCycle = 40;
        }
    }
    
    public void init() {
        PlayerSprite.initClass(this.m_playerFighterType);
        this.m_incomingIconIndex = 0;
        this.m_incomingCycle = 0;
        this.m_incomingNukeCycle = 0;
        this.m_numPowerups = 0;
        this.m_flashScreenColor = Color.black;
        Model.g_startTime = System.currentTimeMillis();
        for (int i = 0; i < this.m_players.length; ++i) {
            this.m_players[i].resetPowerups();
        }
        this.boardChanged = true;
        final boolean b = false;
        this.secondaryFire = (b ? 1 : 0);
        this.up = (b ? 1 : 0);
        this.down = (b ? 1 : 0);
        this.right = (b ? 1 : 0);
        this.left = (b ? 1 : 0);
        this.fire = (b ? 1 : 0);
        this.gameOver = false;
        this.refreshStatus = true;
        double n = 3.0;
        WormholeModel.gOrbitDistance = 240;
        if (super.m_tableElement != null) {
            int totalOpposingPlayingPlayers = this.m_totalOpposingPlayingPlayers;
            switch (super.m_tableElement.getBoardSize()) {
            	// setting local totalOpposingPlayingPlayers to change the board size
                case 1: {
                    totalOpposingPlayingPlayers = 1;
                    break;
                }
                case 2: {
                    totalOpposingPlayingPlayers = 2;
                    break;
                }
                case 3: {
                    totalOpposingPlayingPlayers = 4;
                    break;
                }
            }
            switch (totalOpposingPlayingPlayers) {
                case 1: {
                    n = 2.0;
                    WormholeModel.gOrbitDistance = 150;
                    break;
                }
                case 2:
                case 3: {
                    n = 3.0;
                    WormholeModel.gOrbitDistance = 240;
                    break;
                }
                default: {
                    n = 3.6;
                    WormholeModel.gOrbitDistance = 280;
                    break;
                }
            }
        }
        int n2 = 0;
        do {
            this.m_novaInfo[n2][0] = 50.0;
        } while (++n2 < 60);
        this.totalBoardW = (int)(this.boardWidth / 1.5 * n);	// divide by 1.5 because we increased viewing size from ~420 to 700, which scaled map size here
        this.totalBoardH = (int)(this.boardHeight / 1.5 * n);
        this.m_boardCenterX = this.totalBoardW / 2 ;
        this.m_boardCenterY = this.totalBoardH / 2;
        this.m_rectCenterBox = new Rectangle(this.m_boardCenterX - 100, this.m_boardCenterY - 100, 200, 200);
        this.m_portalVisibility = (int)(this.boardWidth / 2.0 * 1.45);
        this.m_offsetX = this.boardWidth / 2;
        this.m_offsetY = this.boardHeight / 2;
        final int n3 = this.m_boardCenterX - 40;
        final int n4 = this.m_boardCenterY - 40;
        int n5 = 0;
        do {
            this.m_starX[n5] = WHUtil.randABSInt() % this.totalBoardW;
            this.m_starY[n5] = WHUtil.randABSInt() % this.totalBoardH;
            if (n5 < 35) {
                do {
                    this.m_narrowStarX[n5] = WHUtil.randABSInt() % this.boardWidth;
                    this.m_narrowStarY[n5] = WHUtil.randABSInt() % this.boardHeight;
                } while (this.m_narrowStarX[n5] > n3 && this.m_narrowStarX[n5] < n3 + 80 && this.m_narrowStarY[n5] < n4 && this.m_narrowStarY[n5] < n4 + 80);
            }
            this.m_starSize[n5] = WHUtil.randABSInt() % 3 + 1;
        } while (++n5 < 70);
        Sprite.setGlobalBounds(this.totalBoardW, this.totalBoardH);
        BulletSprite.clearClass();
        this.m_vMessages.removeAllElements();
        this.allSprites.clear();
        this.goodGuys.clear();
        this.badGuys.clear();
        if (this.m_color != null) {
            this.m_borderShades[0] = this.m_color;
            for (int j = 1; j < this.m_borderShades.length; ++j) {
                this.m_borderShades[j] = this.m_borderShades[j - 1].darker();
            }
        }
        this.m_winningPlayerString = null;
        this.m_player = new PlayerSprite(this.m_boardCenterX, this.m_boardCenterY, this.m_playerFighterType);
        this.m_imgLogo = null;
        if (this.m_imgLogo != null) {
            this.m_rectLogo.setBounds(this.m_boardCenterX - this.m_imgLogo.getWidth(null) / 2, this.m_boardCenterY - this.m_imgLogo.getHeight(null) / 2, this.m_imgLogo.getWidth(null), this.m_imgLogo.getHeight(null));
        }
        this.m_player.addSelf();
        this.m_player.setPlayer(super.m_slot);
        new WallCrawlerSprite(0, 0, true).addSelf();
        new WallCrawlerSprite(0, 0, false).addSelf();
    }
    
    private void drawStars(final Graphics graphics, final Color color, final int[] array, final int[] array2, final boolean b) {
        graphics.setColor(color);
        for (int i = 0; i < array.length; ++i) {
            if (b && this.m_player.getViewRect().contains(array[i], array2[i])) {
                graphics.fillRect(array[i], array2[i], this.m_starSize[i], this.m_starSize[i]);
            }
            else {
                graphics.fillRect(array[i], array2[i], this.m_starSize[i], this.m_starSize[i]);
            }
        }
    }
    
    public void usePowerup(final byte powerupType, final byte upgradeLevel, final byte toSlot, final short gameSession, final short gameId) {
        super.m_logic.addCredits(1);
        synchronized (super.m_logic.getNetwork()) {
            final DataOutput stream = super.m_logic.getNetwork().getStream(gameId);
            try {
                stream.writeByte(107);
                stream.writeShort(gameSession);
                stream.writeByte(powerupType);
                stream.writeByte(toSlot);
                stream.writeByte(upgradeLevel);
                super.m_logic.getNetwork().sendPacket();
            }
            catch (Exception ex) {}
        }
        // monitorexit(super.m_logic.getNetwork())
    }
    
    public void drawPowerups(final Graphics graphics) {
        for (int i = this.m_numPowerups - 1; i >= 0; --i) {
            graphics.drawImage(getImages("img_smallpowerups")[PowerupSprite.convertToSmallImage(this.m_powerups[i])], i * 23, 0, null);
        }
    }
    
    private void doBehavior() {
        for (int i = this.allSprites.maxElement; i > -1; --i) {
            final Sprite sprite = this.allSprites.sprites[i];
            if (sprite != null) {
                if (sprite.shouldRemoveSelf) {
                    sprite.removeSelf();
                }
                else {
                    sprite.behave();
                }
            }
        }
        if (this.m_lastCycleForMessages < this.cycle && this.m_vMessages.size() > 0) {
            this.m_vMessages.removeElementAt(0);
        }
        final long n = (System.currentTimeMillis() - Model.g_startTime) / 1000L;
        int n2 = 500;
        if (n > 240L) {
            n2 = 400;
        }
        else if (n > 120L) {
            n2 = 450;
        }
        else if (n > 80L) {
            n2 = 500;
        }
        else if (n < 40L) {
            return;
        }
        if (WHUtil.randABSInt() % n2 == 1) {
            final int n3 = WHUtil.randABSInt() % this.m_players.length;
            for (int j = 0; j < this.m_players.length; ++j) {
                final PlayerInfo playerInfo = this.m_players[(n3 + j) % this.m_players.length];
                if (playerInfo.isPlaying() && playerInfo.m_portalSprite != null) {
                    playerInfo.m_portalSprite.m_bGenEnemy = true;
                    return;
                }
            }
        }
    }
    
    void drawIntro(final Graphics graphics) {
        graphics.setColor(Color.lightGray);
        graphics.fill3DRect(this.m_introX, this.m_introY, 410, 260, true);
        graphics.setColor(Color.white);
        graphics.setFont(WormholeModel.fontFourteen);
        graphics.drawString("Wormhole NG Ship Selection", this.m_introX + 100, this.m_introY + 16);
        graphics.setFont(WormholeModel.fontTwelve);
        graphics.drawString("Choose a ship by clicking on it.", this.m_introX + 100, this.m_introY + 28);
        graphics.setColor(Color.gray);
        graphics.fillRect(this.m_intro_shipX, this.m_intro_shipY, 400, 50);
        graphics.setColor(this.m_color);
        graphics.drawRect(this.m_intro_shipX, this.m_intro_shipY, 400, 50);
        final boolean hasPermission = this.hasShipPermission((byte)PlayerSprite.g_fighterData[this.m_describedShip][13]);
        int n = 0;
        do {
            graphics.setColor(this.m_color);
            this.drawFighter(graphics, n, this.m_intro_shipX + n * 50 + 25, this.m_intro_shipY + n / 8 * 50 + 25);
        } while (++n < 8);
        final int n2 = this.m_intro_shipX + this.m_describedShip % 8 * 50 + 25;
        final int n3 = this.m_intro_shipY + this.m_describedShip / 8 * 50 + 25;
        final int n4 = this.m_intro_shipY + 50 + 10;
        final int n5 = this.m_intro_shipX + 200;
        Color black = Color.black;
        if (hasPermission) {
            black = Sprite.g_colors[super.m_slot][this.m_currentFighterShade / 2 % 20];
        }
        graphics.setColor(black);
        graphics.drawOval(n2 - 15, n3 - 15, 30, 30);
        graphics.drawLine(n2, n3 + 15, n2, n4);
        graphics.drawLine(n2, n4, n5, n4);
        graphics.drawLine(n5, n4, n5, n4 + 10);
        graphics.drawRect(n5 - 50, n4 + 10, this.m_introX + 410 - (n5 - 50) - 15, this.m_introY + 260 - n4 - 15);
        final String[] array = PlayerSprite.g_shipDescriptions[this.m_describedShip];
        final int n6 = n5 - 40;
        final int n7 = n4 + 10;
        graphics.setColor(Color.white);
        for (int i = 1; i < array.length; ++i) {
            graphics.drawString(array[i], n6, n7 + i * 12);
        }
        double zoomInIntro = PlayerSprite.g_fighterData[this.m_describedShip][2];
        if (hasPermission) {
            graphics.setColor(this.m_color);
        }
        else {
            graphics.setColor(Color.black);
        }
        if (this.m_zoomInIntro < zoomInIntro) {
            this.m_zoomInIntro += zoomInIntro / 50.0;
            zoomInIntro = this.m_zoomInIntro;
            if (hasPermission) {
                graphics.setColor(Sprite.g_colors[super.m_slot][(int)((zoomInIntro - this.m_zoomInIntro) / zoomInIntro * 19.0)]);
            }
        }
        graphics.translate(this.m_introX + 75, this.m_introY + 180);
        //WHUtil.drawScaledPoly(graphics, PlayerSprite.g_polyShip[this.m_describedShip][this.m_currentFighterShade / 2 % 24], zoomInIntro);
        WHUtil.drawScaledPoly(graphics, PlayerSprite.g_polyShip[this.m_describedShip][this.m_currentFighterShade * 10 / PlayerSprite.DROTATE % PlayerSprite.NROTATIONS], zoomInIntro);
        graphics.translate(-(this.m_introX + 75), -(this.m_introY + 180));
        graphics.setColor(Color.white);
        graphics.drawString(array[0], this.m_introX + 10, this.m_introY + 110);
        if (!hasPermission) {
            graphics.setColor(Color.red);
            graphics.drawString("Enable extra ships in", this.m_introX + 10, this.m_introY + 180);
            graphics.drawString("create table options", this.m_introX + 10, this.m_introY + 192);
        }
    }
    
    void drawStrings(final Graphics graphics, final String s, final String s2) {
        final int n = this.m_introY - 115;
        final int n2 = n + 30;
        graphics.setColor(this.m_color);
        graphics.fillRoundRect(50, n, this.boardWidth - 100, 100, 30, 30);
        graphics.setColor((this.m_color == Color.blue) ? Color.white : Color.black);
        this.drawCenteredString(graphics, "Wormhole NG", n2, 0);
        this.drawCenteredString(graphics, s, n2 + 28, 0);
        this.drawCenteredString(graphics, s2, n2 + 56, 0);
    }
}

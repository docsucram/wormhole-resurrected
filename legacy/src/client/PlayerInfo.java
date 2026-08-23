package client;
import java.awt.*;
import java.awt.image.*;
import java.io.*;

public class PlayerInfo
{
    private static final int BLOCKSIZE = 5;
    static final int[][] g_powerupPoints;
    public boolean m_gameOver;
    public int whacksAtYou;
    public int whacksAgainst;
    public int whacksAtYouTotal;
    public int whacksAgainstTotal;
    public int m_wins;
    public boolean m_bRefresh;
    public int m_width;
    public int m_height;
    public ImagePanel m_canvas;
    public int m_shipType;
    public int m_rank;
    public String[] m_icons;
    public byte m_teamID;
    private static final int g_titleBarH = 40;
    int m_myHeight;
    int m_cx;
    int m_cy;
    PortalSprite m_portalSprite;
    Image[] m_imgPowerups;
    int offsetCycle;
    private int m_y;
    private int m_h;
    short m_healthPercentage;
    byte m_nPowerups;
    byte[] m_powerups;
    static final int POWERUP_FIELDS = 6;
    static final int POWERUP_LEN = 10;
    double[][] m_powerupTimeouts;
    static final int POWERUP_DISPLAY_TIMEOUT = 10000;
    int m_oldHealth;
    String m_username;
    Color m_color;
    boolean m_bEmpty;
    short m_slot;
    
    public void setDrawLocation(final int y, final int h) {
        this.m_y = y;
        this.m_h = h;
    }
    
    void setState(final String username, final byte b) {
        this.m_bRefresh = true;
        this.m_username = username;
        this.m_slot = b;
        this.m_color = Sprite.g_colors[b][0];
        this.m_bEmpty = false;
    }
    
    void reset() {
        this.m_nPowerups = 0;
        this.m_healthPercentage = 100;
        this.m_bRefresh = true;
        this.m_username = "Empty";
        this.m_bEmpty = true;
        this.m_color = Color.gray;
        this.m_gameOver = false;
        if (this.m_portalSprite != null) {
            this.m_portalSprite.killSelf();
            this.m_portalSprite = null;
        }
        this.m_teamID = 0;
    }
    
    void draw(final Graphics graphics, final int n, final int n2) {
        this.m_bRefresh = false;
        WHUtil.drawBoundRect(graphics, 0, 0, n, n2, this.m_color, this.m_gameOver ? Color.gray : ((this.offsetCycle == 30) ? Color.orange : Color.black));
        graphics.setFont(WormholeModel.fontTwelve);
        graphics.drawString((this.m_username.length() > 12) ? this.m_username.substring(0, 11) : this.m_username, 30, 11);
        if (this.m_bEmpty) {
            return;
        }
        CFSkin.getSkin().drawIcons(graphics, this.m_icons, 97, 2, 15, 3);
        graphics.drawString("wins: " + this.m_wins, 85, 24);
        graphics.drawString("rank: " + ((this.m_rank >= 0) ? ("" + this.m_rank) : "n/a"), 30, 24);
        for (byte b = 0; b < this.m_nPowerups; ++b) {
            graphics.drawImage(this.m_imgPowerups[PowerupSprite.convertToSmallImage(this.m_powerups[b])], 34 + b * 21, 29, null);
        }
        final int n3 = n - 10;
        final int min = Math.min((int)(n3 * this.m_healthPercentage / 100.0), n3);
        graphics.setColor(this.m_color);
        graphics.drawRect(5, n2 - 13, n3, 10);
        graphics.fillRect(5, n2 - 13, min, 10);
        int n4 = 15;
        int n5 = n2 / 2;
        if (this.offsetCycle > 0) {
            --this.offsetCycle;
            n4 += WHUtil.randInt() % 2;
            n5 += WHUtil.randInt() % 2;
            this.m_bRefresh = true;
            Sprite.model.m_bRefreshPlayerBar = true;
        }
        final double n6 = PlayerSprite.g_fighterData[this.m_shipType][1];
        graphics.translate(n4, n5);
        WHUtil.drawScaledPoly(graphics, PlayerSprite.g_polyShip[this.m_shipType][0], n6);
        graphics.translate(-n4, -n5);
        if (this.m_teamID != 0 && Sprite.model.m_tableElement.isTeamTable()) {
            drawTeamShape(graphics, 1, 1, this.m_teamID);
        }
    }
    
    PlayerInfo() {
        this.m_rank = -1;
        this.m_powerups = new byte[5];
        this.m_powerupTimeouts = new double[6][10];
        this.m_username = "Empty";
        this.m_bEmpty = true;
        this.reset();
        this.m_imgPowerups = (Image[])WormholeModel.g_mediaTable.get("img_smallpowerups");
        this.m_myHeight = 158;
    }
    
    void fullReset() {
        this.m_wins = 0;
        this.reset();
    }
    
    public static final void drawTeamShape(final Graphics graphics, final int n, final int n2, final int n3) {
        if (n3 == 1) {
            WHUtil.drawBoundRect(graphics, n, n2, 8, 8, CFSkin.TEAM_COLORS[n3], CFSkin.TEAM_BG_COLORS[n3]);
            return;
        }
        WHUtil.drawBoundCircle(graphics, n, n2, 10, CFSkin.TEAM_BG_COLORS[n3], CFSkin.TEAM_COLORS[n3]);
    }
    
    void addEnemyPowerupAttack(final short n, final byte b) {
    }
    
    void readState(final DataInput dataInput) throws IOException {
        this.m_bRefresh = true;
        this.m_oldHealth = this.m_healthPercentage;
        this.m_healthPercentage = dataInput.readShort();
        if (this.m_oldHealth > this.m_healthPercentage) {
            this.offsetCycle = 30;
        }
        this.m_nPowerups = dataInput.readByte();
        for (byte b = 0; b < this.m_nPowerups; ++b) {
            this.m_powerups[b] = dataInput.readByte();
        }
        this.m_shipType = dataInput.readByte();
        if (this.m_shipType > 10 || this.m_shipType < 0) {
            this.m_shipType = 0;
        }
    }
    
    boolean isPlaying() {
        return !this.m_bEmpty && !this.m_gameOver && this.m_portalSprite != null && !this.m_portalSprite.shouldRemoveSelf;
    }
    
    static {
        g_powerupPoints = new int[][] { { 20, 60 }, { 7, 100 }, { 41, 147 }, { 91, 147 }, { 97, 60 }, { 105, 100 } };
    }
    
    boolean timeoutAttacks() {
        final double n = System.currentTimeMillis();
        boolean b = false;
        int n2 = 0;
        do {
            int n3 = 0;
            do {
                if (this.m_powerupTimeouts[n2][n3] > 0.0 && n > this.m_powerupTimeouts[n2][n3]) {
                    this.m_powerupTimeouts[n2][n3] = 0.0;
                    b = true;
                    this.m_bRefresh = true;
                }
            } while (++n3 < 10);
        } while (++n2 < 6);
        return b;
    }
    
    public boolean containsClick(final int n) {
        return n >= this.m_y && n <= this.m_h + this.m_y;
    }
    
    void resetPowerups() {
        int n = 0;
        do {
            int n2 = 0;
            do {
                this.m_powerupTimeouts[n][n2] = 0.0;
            } while (++n2 < 10);
        } while (++n < 6);
    }
}

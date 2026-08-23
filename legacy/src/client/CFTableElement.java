package client;
import java.awt.*;

class CFTableElement extends CFElement
{
    public static final String OPENSLOT = "Open Slot";
    private int m_tableID;
    private byte m_status;
    private IListener m_listener;
    private String[] m_names;
    private int m_numPlayers;
    private boolean m_bPrivate;
    private boolean m_bRanked;
    private boolean m_bTeamTable;
    private boolean m_bAllShipsAllowed;
    private boolean m_bAllPowerupsAllowed;
    private byte m_boardSize;
    private boolean m_bBalancedTeams;
    private String m_text;
    private int m_countdown;
    private String[][] m_options;
    private boolean m_bOver;
    private int m_lastMouseX;
    private int m_lastMouseY;
    
    public boolean getOptionBool(final String s) {
        return this.getOption(s) != null;
    }
    
    public void draw(final Graphics graphics) {
        CFSkin.getSkin().paintCFTableElement(graphics, this);
    }
    
    public CFTableElement(final IListener listener, final int tableID, final int n) {
        this.m_names = new String[n];
        this.m_tableID = tableID;
        this.m_listener = listener;
        for (int i = 0; i < this.m_names.length; ++i) {
            this.m_names[i] = "Open Slot";
        }
    }
    
    public void removePlayer(final String s) {
        for (int i = 0; i < this.m_names.length; ++i) {
            if (this.m_names[i].equals(s)) {
                this.m_names[i] = "Open Slot";
                --this.m_numPlayers;
                this.repaint();
                return;
            }
        }
    }
    
    public void handleMouseOver(final int n, final int n2) {
        if (!this.m_bOver) {
            this.repaint();
        }
        this.m_bOver = true;
    }
    
    public void setOptions(final boolean bRanked, final boolean bPrivate, final boolean bAllShipsAllowed, final boolean bAllPowerupsAllowed, final boolean bTeamTable, final byte boardSize, final boolean bBalancedTeams, final String[][] options) {
        this.m_bRanked = bRanked;
        this.m_bPrivate = bPrivate;
        this.m_bTeamTable = bTeamTable;
        this.m_boardSize = boardSize;
        this.m_bAllShipsAllowed = bAllShipsAllowed;
        this.m_bAllPowerupsAllowed = bAllPowerupsAllowed;
        this.m_bBalancedTeams = bBalancedTeams;
        this.m_options = options;
        this.repaint();
    }
    
    public String getOption(final String s) {
        if (this.m_options != null) {
            for (int i = 0; i < this.m_options.length; ++i) {
                if (this.m_options[i][0].equals(s)) {
                    return this.m_options[i][1];
                }
            }
        }
        return null;
    }
    
    public int getCountdown() {
        return this.m_countdown;
    }
    
    public boolean isOver() {
        return this.m_bOver;
    }
    
    public boolean isPrivate() {
        return this.m_bPrivate;
    }
    
    public boolean allShipsAllowed() {
        return this.m_bAllShipsAllowed;
    }
    
    public boolean allPowerupsAllowed() {
        return this.m_bAllPowerupsAllowed;
    }
    
    public boolean isRanked() {
        return this.m_bRanked;
    }
    
    public void handleMouseExitted(final int n, final int n2) {
        if (this.m_bOver) {
            this.repaint();
        }
        this.m_bOver = false;
    }
    
    public void handleMouseReleased(final int n, final int n2) {
        final String tablePlayerClick = CFSkin.getSkin().isTablePlayerClick(this, n, n2);
        if (tablePlayerClick == null) {
            if (CFSkin.getSkin().isJoinTableClick(this, n, n2)) {
                this.m_listener.fireEvent(this, null);
            }
        }
        else {
            this.m_listener.fireEvent(this, tablePlayerClick);
        }
    }
    
    public void recommendWidth(final int width) {
        super.m_width = width;
    }
    
    public boolean isBigTable() {
        return this.m_numPlayers > 4;
    }
    
    public void addPlayer(final String username, final byte slot) {
        this.m_names[slot] = username;
        ++this.m_numPlayers;
        this.repaint();
    }
    
    public String[] getNames() {
        return this.m_names;
    }
    
    public byte getBoardSize() {
        return this.m_boardSize;
    }
    
    public int getTableID() {
        return this.m_tableID;
    }
    
    public void setStatus(final byte b) {
        this.setStatus(b, this.m_countdown);
    }
    
    public void setStatus(final byte status, final int countdown) {
        boolean b = false;
        if (this.m_countdown != countdown) {
            this.m_countdown = countdown;
            b = true;
        }
        if (this.m_status != status) {
            this.m_status = status;
            b = true;
        }
        if (b) {
            this.repaint();
        }
    }
    
    public byte getStatus() {
        return this.m_status;
    }
    
    public boolean isBalancedTeams() {
        return this.m_bBalancedTeams;
    }
    
    public int getNumPlayers() {
        return this.m_numPlayers;
    }
    
    public String getPlayer(int slot) {
        return this.m_names[slot];
    }
    
    public int getSlot(String username) {
    	for (int i=0; i<this.m_names.length; i++) {
    		if (this.m_names[i].equals(username)) {
    			return i;
    		}
    	}
    	return -1;
    }
    
    public boolean isTeamTable() {
        return this.m_bTeamTable;
    }
}

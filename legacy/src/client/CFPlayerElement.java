package client;
import java.awt.*;

class CFPlayerElement extends CFElement
{
    private String m_name;
    private IListener m_listener;
    private boolean m_bGuestString;
    private int m_tableID;
    private int m_rank;
    private String[] m_icons;
    private String m_clan;
    private boolean m_bIgnored;
    public static String GUEST_STRING;
    
    public boolean isGuest() {
        return this.m_bGuestString;
    }
    
    public void draw(final Graphics graphics) {
        CFSkin.getSkin().paintCFPlayerElement(graphics, this);
    }
    
    public CFPlayerElement(final IListener listener, final String name, final String clan, final int rank, final String[] icons) {
        this.m_tableID = -1;
        this.m_name = name;
        this.m_clan = clan;
        this.m_listener = listener;
        this.m_rank = rank;
        this.m_bGuestString = (CFPlayerElement.GUEST_STRING != null && this.m_name.startsWith(CFPlayerElement.GUEST_STRING));
        this.m_icons = icons;
    }
    
    public boolean getIgnored() {
        return this.m_bIgnored;
    }
    
    public void setIgnored(final boolean bIgnored) {
        this.m_bIgnored = bIgnored;
    }
    
    public void handleMouseClicked(final int n, final int n2) {
    }
    
    public void handleMousePressed(final int n, final int n2) {
        this.m_listener.fireEvent(this, null);
        this.repaint();
    }
    
    public void handleMouseOver(final int n, final int n2) {
    }
    
    public String[] getIcons() {
        return this.m_icons;
    }
    
    public int compareTo(final CFElement cfElement) {
        if (cfElement == null || !(cfElement instanceof CFPlayerElement)) {
            return 0;
        }
        final CFPlayerElement cfPlayerElement = (CFPlayerElement)cfElement;
        if (CFPlayerElement.GUEST_STRING != null && this.m_bGuestString != cfPlayerElement.isGuest()) {
            if (cfPlayerElement.isGuest()) {
                return -1;
            }
            return 1;
        }
        else {
            final boolean b = cfPlayerElement.getIcons().length > 0;
            if (b == this.m_icons.length > 0) {
                return this.m_name.toLowerCase().compareTo(cfPlayerElement.getName().toLowerCase());
            }
            if (b) {
                return 1;
            }
            return -1;
        }
    }
    
    public String getClan() {
        return this.m_clan;
    }
    
    public void handleMouseReleased(final int n, final int n2) {
    }
    
    static {
        CFPlayerElement.GUEST_STRING = "";
    }
    
    public String getName() {
        return this.m_name;
    }
    
    public int getTableID() {
        return this.m_tableID;
    }
    
    public void setTableID(final int tableID) {
        this.m_tableID = tableID;
        this.repaint();
    }
    
    public int getRank() {
        return this.m_rank;
    }
    
    public void setRank(final int rank) {
        this.m_rank = rank;
        this.repaint();
    }
    
    public static void setGuestString(final String guest_STRING) {
        CFPlayerElement.GUEST_STRING = guest_STRING;
    }
}

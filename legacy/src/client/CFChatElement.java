package client;
import java.util.*;
import java.awt.*;

class CFChatElement extends CFElement
{
    private IListener m_listener;
    private Vector m_vText;
    private Font m_font;
    private boolean m_bColorFront;
    private Color m_whoColor;
    private static final int m_verticalSpacing = 2;
    private String m_whoSaid;
    private int m_spacing;
    private boolean m_bOver;
    
    private void parseString(final String s) {
        this.m_vText.removeAllElements();
        final FontMetrics fontMetrics = Toolkit.getDefaultToolkit().getFontMetrics(this.m_font);
        final StringTokenizer stringTokenizer = new StringTokenizer(s, " ", false);
        String s2 = "";
        this.m_spacing = 2 + fontMetrics.getAscent();
        while (stringTokenizer.hasMoreTokens()) {
            final String nextToken = stringTokenizer.nextToken();
            String string;
            if (s2.length() == 0) {
                string = nextToken;
            }
            else {
                string = s2 + " " + nextToken;
            }
            if (fontMetrics.stringWidth(string) < super.m_width) {
                s2 = string;
            }
            else if (s2.length() == 0) {
                this.m_vText.addElement(nextToken);
            }
            else {
                this.m_vText.addElement(s2);
                s2 = nextToken;
            }
        }
        if (s2.length() > 0) {
            this.m_vText.addElement(s2);
        }
        super.m_height = this.m_vText.size() * this.m_spacing;
    }
    
    public CFChatElement(final IListener listener, final Font font, final String whoSaid, final String s, String string, final int width) {
        this.m_vText = new Vector();
        this.m_whoColor = Color.black;
        this.m_listener = listener;
        if (s != null) {
            this.m_whoSaid = whoSaid;
            string = s + ": " + string;
            this.m_bColorFront = true;
        }
        if (this.m_whoSaid == null) {
            this.m_whoSaid = "";
        }
        this.m_font = font;
        super.m_width = width;
        this.parseString(string);
        if (super.m_height < 4) {
            super.m_height = 10;
        }
    }
    
    public void draw(final Graphics graphics) {
        CFSkin.getSkin().paintCFChatElement(graphics, this);
    }
    
    public void handleMouseOver(final int n, final int n2) {
        if (!this.m_bOver) {
            this.repaint();
        }
        this.m_bOver = true;
    }
    
    public Vector getLines() {
        return this.m_vText;
    }
    
    public Font getFont() {
        return this.m_font;
    }
    
    public void handleMouseExitted(final int n, final int n2) {
        if (this.m_bOver) {
            this.repaint();
        }
        this.m_bOver = false;
    }
    
    public void handleMouseReleased(final int n, final int n2) {
        this.m_listener.fireEvent(this, this.m_whoSaid);
    }
    
    public void setWhoColor(final Color whoColor) {
        this.m_whoColor = whoColor;
    }
    
    public Color getWhoColor() {
        return this.m_whoColor;
    }
    
    public boolean getDrawWho() {
        return this.m_bColorFront;
    }
    
    public int getSpacing() {
        return this.m_spacing;
    }
}

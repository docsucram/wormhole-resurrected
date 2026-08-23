package client;
import java.awt.*;

abstract class CFElement
{
    protected int m_x;
    protected int m_y;
    protected int m_height;
    protected int m_width;
    protected Color m_fgColor;
    protected Color m_bgColor;
    protected Component m_parent;
    
    public int getX() {
        return this.m_x;
    }
    
    public void setBackground(final Color bgColor) {
        this.m_bgColor = bgColor;
    }
    
    public Color getBackground() {
        return this.m_bgColor;
    }
    
    abstract void draw(final Graphics p0);
    
    public void setParent(final Component parent) {
        this.m_parent = parent;
    }
    
    public void repaint() {
        if (this.m_parent != null) {
            this.m_parent.repaint();
        }
    }
    
    public void handleMouseClicked(final int n, final int n2) {
    }
    
    public void handleMousePressed(final int n, final int n2) {
    }
    
    CFElement() {
        this.m_fgColor = Color.white;
        this.m_bgColor = Color.black;
    }
    
    public void handleMouseOver(final int n, final int n2) {
    }
    
    public boolean contains(final int n, final int n2) {
        return n >= this.m_x && n <= this.m_x + this.m_width && n2 >= this.m_y && n2 <= this.m_y + this.m_height;
    }
    
    public int compareTo(final CFElement cfElement) {
        return 0;
    }
    
    public void handleMouseReleased(final int n, final int n2) {
    }
    
    public void handleMouseExitted(final int n, final int n2) {
    }
    
    public int getY() {
        return this.m_y;
    }
    
    public int getHeight() {
        return this.m_height;
    }
    
    public void setSize(final int width, final int height) {
        this.m_width = width;
        this.m_height = height;
    }
    
    public void setForeground(final Color fgColor) {
        this.m_fgColor = fgColor;
    }
    
    public Color getForeground() {
        return this.m_fgColor;
    }
    
    public int getWidth() {
        return this.m_width;
    }
    
    public void setLocation(final int x, final int y) {
        this.m_x = x;
        this.m_y = y;
    }
}

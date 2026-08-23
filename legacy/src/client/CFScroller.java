package client;
import java.util.*;
import java.awt.event.*;
import java.awt.*;
import java.awt.image.*;

public class CFScroller extends Panel implements AdjustmentListener, MouseListener, MouseMotionListener
{
    public static final int VBAR_WIDTH = 15;
    public static final int LEFT = 0;
    public static final int CENTER = 1;
    protected Scrollbar m_vBar;
    protected Vector m_vComponents;
    protected IListener m_listener;
    private int m_yBuffer;
    protected int m_offsetY;
    private int m_vCentering;
    protected int m_scrollingAreaWidth;
    protected int m_scrollingAreaHeight;
    protected boolean m_bSorted;
    private Image m_offscreen;
    private Graphics m_offscreenG;
    protected int m_leftGutter;
    protected int m_rightGutter;
    protected int m_topGutter;
    protected int m_bottomGutter;
    protected int m_totalVerticalGutter;
    protected int m_totalHorizontalGutter;
    private int m_alignment;
    protected boolean m_bIEFix;
    private CFElement m_lastOver;
    
    public Rectangle getInnerBounds() {
        return new Rectangle(this.m_leftGutter, this.m_topGutter, this.m_scrollingAreaWidth + 15, this.m_scrollingAreaHeight);
    }
    
    public void adjustmentValueChanged(final AdjustmentEvent adjustmentEvent) {
        this.m_offsetY = adjustmentEvent.getValue();
        this.m_vBar.setValue(this.m_offsetY);
        this.repaint();
    }
    
    public void mouseClicked(final MouseEvent mouseEvent) {
        final CFElement at = this.findAt(mouseEvent);
        if (at != null) {
            at.handleMouseClicked(mouseEvent.getX(), mouseEvent.getY());
        }
    }
    
    public void mousePressed(final MouseEvent mouseEvent) {
        final CFElement at = this.findAt(mouseEvent);
        if (at != null) {
            at.handleMousePressed(mouseEvent.getX(), mouseEvent.getY());
        }
    }
    
    public void mouseDragged(final MouseEvent mouseEvent) {
        this.handleMouseMovement(mouseEvent);
    }
    
    public CFScroller(final IListener listener) {
        this.m_vComponents = new Vector();
        this.setLayout(null);
        this.m_listener = listener;
        (this.m_vBar = new Scrollbar(1)).addAdjustmentListener(this);
        this.add(this.m_vBar);
        this.addMouseListener(this);
        this.addMouseMotionListener(this);
        this.setGutters(2, 2, 2, 2);
    }
    
    public void mouseReleased(final MouseEvent mouseEvent) {
        final CFElement at = this.findAt(mouseEvent);
        if (at != null) {
            at.handleMouseReleased(mouseEvent.getX(), mouseEvent.getY());
            return;
        }
        if (this.m_lastOver != null) {
            this.m_lastOver.handleMouseExitted(mouseEvent.getX(), mouseEvent.getY());
            this.m_lastOver = null;
        }
    }
    
    public void mouseMoved(final MouseEvent mouseEvent) {
        this.handleMouseMovement(mouseEvent);
    }
    
    protected void removeElement(final CFElement cfElement) {
        if (cfElement != null) {
            this.m_vComponents.removeElement(cfElement);
            this.layoutComponents();
            this.repaint();
        }
    }
    
    public void paint(final Graphics graphics) {
        if (this.m_offscreenG == null) {
            return;
        }
        this.prepaint(this.m_offscreenG);
        final int offsetY = this.m_offsetY;
        this.m_offscreenG.setClip(this.m_leftGutter, this.m_topGutter, this.m_scrollingAreaWidth, this.m_scrollingAreaHeight);
        for (int i = 0; i < this.m_vComponents.size(); ++i) {
            final CFElement cfElement = (CFElement)this.m_vComponents.elementAt(i);
            if (cfElement != null) {
                final int n = cfElement.getY() - offsetY;
                if ((n <= this.m_topGutter + this.m_scrollingAreaHeight && n >= this.m_topGutter) || (n + cfElement.getHeight() <= this.m_topGutter + this.m_scrollingAreaHeight && n + cfElement.getHeight() >= this.m_topGutter)) {
                    this.m_offscreenG.translate(cfElement.getX(), n);
                    cfElement.draw(this.m_offscreenG);
                    this.m_offscreenG.translate(-cfElement.getX(), -n);
                }
            }
        }
        this.m_offscreenG.setClip(0, 0, this.getSize().width, this.getSize().height);
        this.postpaint(this.m_offscreenG);
        if (this.m_offscreen != null) {
            graphics.drawImage(this.m_offscreen, 0, 0, null);
        }
    }
    
    protected void removeAllElements() {
        this.m_vComponents.removeAllElements();
        this.layoutComponents(0);
        this.repaint();
    }
    
    protected void addSortedElement(final CFElement cfElement) {
        if (cfElement != null) {
            this.insertSorted(cfElement);
            this.layoutComponents();
            this.repaint();
        }
    }
    
    public void mouseEntered(final MouseEvent mouseEvent) {
    }
    
    public void mouseExited(final MouseEvent mouseEvent) {
        if (this.m_lastOver != null) {
            this.m_lastOver.handleMouseExitted(mouseEvent.getX(), mouseEvent.getY());
            this.m_lastOver = null;
        }
    }
    
    private void insertSorted(final CFElement cfElement) {
        for (int i = 0; i < this.m_vComponents.size(); ++i) {
            if (cfElement.compareTo((CFElement)this.m_vComponents.elementAt(i)) < 0) {
                this.m_vComponents.insertElementAt(cfElement, i);
                return;
            }
        }
        this.m_vComponents.addElement(cfElement);
    }
    
    public void update(final Graphics graphics) {
        this.paint(graphics);
    }
    
    protected void postpaint(final Graphics graphics) {
    }
    
    private void handleMouseMovement(final MouseEvent mouseEvent) {
        final CFElement at = this.findAt(mouseEvent);
        if (at != null) {
            at.handleMouseOver(mouseEvent.getX(), mouseEvent.getY());
            if (at == this.m_lastOver) {
                return;
            }
        }
        if (this.m_lastOver != null) {
            this.m_lastOver.handleMouseExitted(mouseEvent.getX(), mouseEvent.getY());
        }
        this.m_lastOver = at;
    }
    
    private CFElement findAt(final MouseEvent mouseEvent) {
        mouseEvent.translatePoint(0, this.m_offsetY);
        synchronized (this.m_vComponents) {
            for (int i = 0; i < this.m_vComponents.size(); ++i) {
                final CFElement cfElement = (CFElement)this.m_vComponents.elementAt(i);
                if (cfElement != null && cfElement.contains(mouseEvent.getX(), mouseEvent.getY())) {
                    // monitorexit(this.m_vComponents)
                    return cfElement;
                }
            }
        }
        // monitorexit(this.m_vComponents)
        return null;
    }
    
    public void setYBuffer(final int yBuffer) {
        this.m_yBuffer = yBuffer;
    }
    
    protected void layoutComponents() {
        this.layoutComponents(this.m_vBar.getValue());
    }
    
    protected void layoutComponents(final int offsetY) {
        int topGutter = this.m_topGutter;
        for (int i = 0; i < this.m_vComponents.size(); ++i) {
            final CFElement cfElement = (CFElement)this.m_vComponents.elementAt(i);
            cfElement.setLocation(((this.m_alignment == 0) ? 0 : ((this.m_scrollingAreaWidth - cfElement.getWidth()) / 2)) + this.m_leftGutter, topGutter);
            topGutter += cfElement.getHeight() + this.m_yBuffer;
        }
        this.m_vBar.setBlockIncrement(this.m_scrollingAreaHeight);
        int n = topGutter - this.m_topGutter;
        if (this.m_bIEFix) {
            n -= this.m_scrollingAreaHeight;
        }
        this.m_vBar.setValues(offsetY, this.m_scrollingAreaHeight, 0, n);
        this.m_offsetY = offsetY;
    }
    
    public void setGutters(final Rectangle rectangle) {
        this.setGutters(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
    }
    
    public void setGutters(final int leftGutter, final int rightGutter, final int topGutter, final int bottomGutter) {
        this.m_leftGutter = leftGutter;
        this.m_rightGutter = rightGutter;
        this.m_topGutter = topGutter;
        this.m_bottomGutter = bottomGutter;
        this.m_totalVerticalGutter = topGutter + bottomGutter;
        this.m_totalHorizontalGutter = leftGutter + rightGutter;
    }
    
    public void setAlignment(final int alignment) {
        this.m_alignment = alignment;
    }
    
    public void setBounds(final Rectangle bounds) {
        super.setBounds(bounds);
        this.m_vBar.setBounds(bounds.width - 15 - this.m_leftGutter, this.m_topGutter, 15, bounds.height - this.m_totalVerticalGutter);
        this.m_scrollingAreaWidth = bounds.width - 15 - this.m_totalHorizontalGutter;
        this.m_scrollingAreaHeight = bounds.height - this.m_totalVerticalGutter;
        this.m_offscreen = GamePanel.m_applet.createImage(bounds.width, bounds.height);
        this.m_offscreenG = this.m_offscreen.getGraphics();
        this.m_vBar.setValues(5, 10, 0, 10);
        this.m_bIEFix = (this.m_vBar.getValue() == 5);
        this.layoutComponents();
    }
    
    protected void prepaint(final Graphics graphics) {
    }
    
    protected void setSorted(final boolean bSorted) {
        this.m_bSorted = bSorted;
    }
}

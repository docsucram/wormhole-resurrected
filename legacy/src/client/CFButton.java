package client;
import java.awt.event.*;
import java.awt.*;

public class CFButton extends Canvas implements MouseListener
{
    private String m_text;
    private FontMetrics m_fm;
    private boolean m_bInButton;
    private boolean m_bDown;
    private IListener m_listener;
    public static final int BTN_DEFAULT = 0;
    public static final int BTN_ROLLOVER = 1;
    public static final int BTN_DEPRESSED = 2;
    private int m_state;
    private int m_btnType;
    private boolean m_bToggled;
    private String m_url;
    private String m_urlTitle;
    private int m_urlW;
    private int m_urlH;
    private int m_subMin;
    private int m_subMax;
    
    public void setText(final String text) {
        this.m_text = text;
    }
    
    public int getButtonType() {
        return this.m_btnType;
    }
    
    public int getState() {
        return this.m_state;
    }
    
    public void mouseClicked(final MouseEvent mouseEvent) {
    }
    
    public void mousePressed(final MouseEvent mouseEvent) {
        this.setState(2);
        this.m_bDown = true;
    }
    
    private void setState(final int state) {
        if (this.m_state != state) {
            this.m_state = state;
            this.repaint();
        }
    }
    
    public CFButton(final String text, final IListener listener, final int btnType) {
        this.m_text = "";
        this.m_text = text;
        this.addMouseListener(this);
        this.m_listener = listener;
        this.m_btnType = btnType;
        this.m_bToggled = true;
    }
    
    public void mouseReleased(final MouseEvent mouseEvent) {
        this.m_bDown = false;
        if (this.m_bInButton) {
            this.setState(1);
            if (this.m_listener != null) {
                this.m_listener.fireEvent(this, null);
                this.m_bToggled = !this.m_bToggled;
            }
        }
        else {
            this.setState(0);
        }
    }
    
    public void paint(final Graphics graphics) {
        CFSkin.getSkin().paintCFButton(graphics, this);
    }
    
    public boolean getToggleOn() {
        return this.m_bToggled;
    }
    
    public void openURLPage() {
        //Util.openPage(this.m_url, this.m_urlW, this.m_urlH, this.m_urlTitle);
    }
    
    public void update(final Graphics graphics) {
        this.paint(graphics);
    }
    
    public void mouseEntered(final MouseEvent mouseEvent) {
        if (this.m_bDown) {
            this.setState(2);
        }
        else if (this.m_state == 0) {
            this.setState(1);
        }
        this.m_bInButton = true;
    }
    
    public void mouseExited(final MouseEvent mouseEvent) {
        this.setState(0);
        this.m_bInButton = false;
        this.repaint();
    }
    
    public void setURLButton(final String url, final int urlW, final int urlH, final String urlTitle, final int subMin, final int subMax) {
        this.m_url = url;
        this.m_urlW = urlW;
        this.m_urlH = urlH;
        this.m_urlTitle = urlTitle;
        this.m_subMin = subMin;
        this.m_subMax = subMax;
    }
    
    public String getText() {
        return this.m_text;
    }
    
    public boolean shouldShowURLButton(final int n) {
        return this.m_subMin == -2 || (n >= this.m_subMin && n <= this.m_subMax);
    }
}

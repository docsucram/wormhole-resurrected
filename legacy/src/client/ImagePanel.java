package client;
import java.awt.image.*;
import java.awt.*;

class ImagePanel extends Panel
{
    private Image m_img;
    public Graphics m_g;
    
    public void paint(final Graphics graphics) {
        synchronized (this) {
            graphics.drawImage(this.m_img, 0, 0, this);
            try {
                this.notifyAll();
            }
            catch (Exception ex) {}
        }
    }
    
    public void completeRepaint() {
        synchronized (this) {
            this.repaint();
            try {
                this.wait(200L);
            }
            catch (Exception ex) {}
        }
    }
    
    public void update(final Graphics graphics) {
        this.paint(graphics);
    }
    
    public void setBounds(final Rectangle bounds) {
        super.setBounds(bounds);
        this.m_img = GamePanel.m_applet.createImage(bounds.width, bounds.height);
        this.m_g = this.m_img.getGraphics();
    }
}

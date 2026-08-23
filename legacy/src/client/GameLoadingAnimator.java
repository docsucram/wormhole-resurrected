package client;
import java.applet.*;
import java.awt.*;
import java.awt.image.*;
import javax.swing.*;

public class GameLoadingAnimator implements Runnable
{
    private int m_loads;
    //Applet m_applet;
    JPanel m_applet;
    int m_width;
    int m_height;
    int m_total;
    Color[] m_gradients;
    Image m_loaderImage;
    Graphics m_loaderG;
    boolean m_bKeepRunning;
    String m_brand;
    int m_brandOffsetX;
    public static final Font m_loadingBoxFont;
    private static final int boxW = 300;
    private static final int boxH = 80;
    private static final int barW = 270;
    private static final int barH = 13;
    private int m_currentShade;
    private static final Color CLR_BOX_FG;
    private static final Color CLR_BOX_BG;
    
    //public GameLoadingAnimator(final Applet applet, final String brand, final int total, final int width, final int height) {
    public GameLoadingAnimator(final JPanel applet, final String brand, final int total, final int width, final int height) {
        this.m_gradients = new Color[25];
        this.m_bKeepRunning = true;
        this.m_applet = applet;
        this.m_brand = brand;
        this.m_total = total;
        this.m_width = width;
        this.m_height = height;
        this.m_loaderImage = applet.createImage(300, 80);
        this.m_loaderG = this.m_loaderImage.getGraphics();
        for (int i = 0; i < this.m_gradients.length; ++i) {
            this.m_gradients[i] = new Color(255, 255, (int)(1.0 * (i * 10)));
        }
        this.m_brandOffsetX = applet.getFontMetrics(GameLoadingAnimator.m_loadingBoxFont).stringWidth(this.m_brand);
    }
    
    private void drawLoad(final Graphics graphics) {
        graphics.setColor(GameLoadingAnimator.CLR_BOX_BG);
        graphics.setFont(GameLoadingAnimator.m_loadingBoxFont);
        graphics.fill3DRect(0, 0, 300, 80, true);
        graphics.setColor(GameLoadingAnimator.CLR_BOX_FG);
        graphics.drawString(this.m_brand, 300 - this.m_brandOffsetX - 16, 20);
        graphics.drawString("Game Effects Loading", 16, 44);
        graphics.fill3DRect(15, 52, 270, 13, true);
        graphics.setColor(this.m_gradients[this.m_currentShade++]);
        this.m_currentShade %= this.m_gradients.length;
        graphics.fillRect(16, 53, (int)(268.0 * (this.m_loads / this.m_total)), 11);
    }
    
    static {
        m_loadingBoxFont = new Font("Helvetica", 0, 10);
        CLR_BOX_FG = Color.black;
        CLR_BOX_BG = Color.lightGray;
    }
    
    public void run() {
        while (this.m_bKeepRunning) {
            try {
                Thread.sleep(10L);
            }
            catch (Exception ex) {}
            this.drawLoad(this.m_loaderG);
            this.m_applet.getGraphics().drawImage(this.m_loaderImage, (this.m_width - 300) / 2, (this.m_height - 80) / 2, null);
            this.m_applet.repaint();
        }
    }
    
    public void notifyLoad() {
        synchronized (this) {
            if (++this.m_loads >= this.m_total) {
                this.m_loads = this.m_total;
            }
        }
    }
}

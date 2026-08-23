package client;
import java.awt.*;

public class CreditsPanel extends Panel implements IListener
{
    private CFButton m_cfBtnPrizeCenter;
    private boolean m_bRegistered;
    private int m_credits;
    private int m_totalCredits;
    
    public void fireEvent(final Object o, final Object o2) {
        //Util.openPage("http://www.centerfleet.com/prizeCenter/prizeAbout.html", 400, 400, "Prize Center");
    }
    
    public void setRegistered(final boolean bRegistered) {
        this.m_bRegistered = bRegistered;
        this.repaint();
    }
    
    public CreditsPanel() {
        this.setLayout(null);
        this.add(this.m_cfBtnPrizeCenter = CFSkin.getSkin().generateCFButton("Prize Center", this, 9));
    }
    
    public void paint(final Graphics graphics) {
        super.paint(graphics);
        final Dimension size = this.getSize();
        graphics.setColor(this.getForeground());
        graphics.drawRoundRect(0, 0, size.width - 1, size.height - 10, 10, 10);
        graphics.setFont(GameConstants.FONT_MEDIUM);
        graphics.drawString("Credits ", 7, 15);
        graphics.setFont(GameConstants.FONT_SMALL);
        if (this.m_bRegistered) {
            graphics.drawString("Total Credits:", 7, 35);
            graphics.drawString("" + this.m_totalCredits, 7, 48);
            graphics.drawString("Game Credits:", 7, 67);
            graphics.drawString("" + this.m_credits, 7, 80);
            return;
        }
        graphics.drawString("Only registered", 7, 30);
        graphics.drawString("users can earn", 7, 40);
        graphics.drawString("credits.", 7, 50);
        graphics.drawString("Potential Credits:", 7, 67);
        graphics.drawString("" + this.m_credits, 7, 80);
    }
    
    public void setTotalCredits(final int totalCredits) {
        this.m_totalCredits = totalCredits;
        this.repaint();
    }
    
    public void setCredits(final int credits) {
        this.m_credits = credits;
        this.repaint();
    }
    
    public int getCredits() {
        return this.m_credits;
    }
    
    public void doLayout() {
        final Dimension size = this.getSize();
        this.m_cfBtnPrizeCenter.setBounds(5, size.height - 37, size.width - 10, 20);
        this.repaint();
    }
}

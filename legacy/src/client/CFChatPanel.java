package client;
import java.awt.event.*;
import java.awt.*;

public class CFChatPanel extends CFScroller implements ActionListener
{
    private int m_maxLines;
    public TextField m_tfChat;
    
    public synchronized void clearLines() {
        this.resetChatLine();
        this.removeAllElements();
    }
    
    public CFChatPanel(final IListener listener, final int maxLines, final int n) {
        super(listener);
        this.m_maxLines = maxLines;
        (this.m_tfChat = new TextField(128)).setSize(1, n);
        this.m_tfChat.addActionListener(this);
        this.add(this.m_tfChat);
    }
    
    public void postpaint(final Graphics graphics) {
        CFSkin.getSkin().paintCFChatPanel(graphics, this);
    }
    
    public void actionPerformed(final ActionEvent actionEvent) {
        if (actionEvent.getSource() == this.m_tfChat && super.m_listener != null) {
            super.m_listener.fireEvent(this, this.m_tfChat.getText());
        }
    }
    
    public synchronized void addLine(final String s, final String s2, final String s3, final Color color) {
        super.m_vComponents.addElement(CFSkin.getSkin().generateCFChatElement(super.m_listener, s, s2, s3, super.m_scrollingAreaWidth, color));
        while (super.m_vComponents.size() > this.m_maxLines) {
            super.m_vComponents.removeElementAt(0);
        }
        final int n = super.m_bIEFix ? (super.m_vBar.getMaximum() - 5) : (super.m_vBar.getMaximum() - super.m_vBar.getVisibleAmount() - 5);
        final int n2 = super.m_bIEFix ? (super.m_vBar.getMaximum() + super.m_scrollingAreaHeight) : super.m_vBar.getMaximum();
        if (super.m_vBar.getValue() >= n) {
            this.layoutComponents(n2);
        }
        else {
            this.layoutComponents();
        }
        super.m_offsetY = super.m_vBar.getValue();
        this.repaint();
    }
    
    public void addLine(final String s, final String s2) {
        this.addLine(s, s, s2, null);
    }
    
    public void addLine(final String s) {
        this.addLine(null, null, s, null);
    }
    
    public void resetChatLine() {
        this.m_tfChat.setText("");
    }
    
    public void setBounds(final Rectangle bounds) {
        super.setBounds(bounds);
        final int height = this.m_tfChat.getSize().height;
        super.m_scrollingAreaHeight -= height;
        this.m_tfChat.setBounds(super.m_leftGutter + 30, bounds.height - super.m_bottomGutter - height + 1, bounds.width - 30 - super.m_totalHorizontalGutter + 2, height);
        super.m_vBar.setSize(15, bounds.height - super.m_totalVerticalGutter - height);
    }
    
    public void prepaint(final Graphics graphics) {
        CFSkin.getSkin().prePaintCFChatPanel(graphics, this);
    }
}

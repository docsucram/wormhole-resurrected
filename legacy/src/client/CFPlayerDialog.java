package client;
import java.awt.*;
import java.awt.event.*;

public class CFPlayerDialog extends Dialog implements IListener, WindowListener, ActionListener, ItemListener
{
    private IListener m_listener;
    public TextField m_tfWhisper;
    public CFButton m_cfBtnOpenGameCard;
    public CFButton m_cfBtnWhisper;
    public CFButton m_cfBtnClose;
    public Checkbox m_cbIgnored;
    private CFPlayerElement m_element;
    private GameNetLogic m_logic;
    private boolean m_bLoggedOff;
    
    public boolean isLoggedOff() {
        return this.m_bLoggedOff;
    }
    
    public void setUserLoggedOff() {
        this.m_bLoggedOff = true;
        this.m_tfWhisper.setVisible(false);
        this.m_cfBtnWhisper.setVisible(false);
        this.m_cbIgnored.setVisible(false);
        this.repaint();
    }
    
    public void fireEvent(final Object o, final Object o2) {
        if (o == this.m_cfBtnWhisper) {
            this.m_logic.whisper(this.m_element.getName(), this.m_tfWhisper.getText());
            this.m_tfWhisper.setText("");
            this.m_tfWhisper.transferFocus();
            return;
        }
        if (o == this.m_cfBtnOpenGameCard) {
            //Util.openPage("http://www.centerfleet.com/", 500, 400, "Ranking");
            return;
        }
        if (o == this.m_cfBtnClose) {
            this.handleClosing();
        }
    }
    
    public CFPlayerDialog(final Frame frame, final IListener listener, final CFPlayerElement element, final GameNetLogic logic) {
        super(frame, "User Profile for " + element.getName(), false);
        this.setLayout(null);
        this.setResizable(false);
        this.m_listener = listener;
        this.m_element = element;
        this.m_logic = logic;
        GamePanel.g_vDialogs.addElement(this);
        (this.m_tfWhisper = new TextField(20)).addActionListener(this);
        this.m_cfBtnWhisper = CFSkin.getSkin().generateCFButton("Send", this, 8);
        this.m_cfBtnClose = CFSkin.getSkin().generateCFButton("Close Window", this, 8);
        this.m_cfBtnOpenGameCard = CFSkin.getSkin().generateCFButton("View Full Ranking", this, 8);
        (this.m_cbIgnored = CFSkin.getSkin().generateCheckBox("Ignored", element.getIgnored())).addItemListener(this);
        this.add(this.m_tfWhisper);
        this.add(this.m_cfBtnWhisper);
        this.add(this.m_cfBtnOpenGameCard);
        this.add(this.m_cfBtnClose);
        this.add(this.m_cbIgnored);
        this.addWindowListener(this);
    }
    
    public void windowDeactivated(final WindowEvent windowEvent) {
    }
    
    public void itemStateChanged(final ItemEvent itemEvent) {
        this.m_logic.setIgnoreUser(this.m_element.getName(), this.m_cbIgnored.getState());
    }
    
    public void paint(final Graphics graphics) {
        CFSkin.getSkin().paintCFPlayerDialog(graphics, this);
    }
    
    public void windowClosing(final WindowEvent windowEvent) {
        this.handleClosing();
    }
    
    private void handleClosing() {
        GamePanel.g_vDialogs.removeElement(this);
        this.dispose();
    }
    
    public void setSelfDialog() {
        this.m_tfWhisper.setVisible(false);
        this.m_cfBtnWhisper.setVisible(false);
        this.m_cbIgnored.setVisible(false);
    }
    
    public void windowOpened(final WindowEvent windowEvent) {
    }
    
    public void windowClosed(final WindowEvent windowEvent) {
    }
    
    public void windowDeiconified(final WindowEvent windowEvent) {
    }
    
    public void windowActivated(final WindowEvent windowEvent) {
    }
    
    public void actionPerformed(final ActionEvent actionEvent) {
        final TextField textField = (TextField)actionEvent.getSource();
        if (textField != null) {
            this.m_logic.whisper(this.m_element.getName(), textField.getText());
            this.m_tfWhisper.setText("");
        }
    }
    
    public CFPlayerElement getCFPlayerElement() {
        return this.m_element;
    }
    
    public void windowIconified(final WindowEvent windowEvent) {
    }
}

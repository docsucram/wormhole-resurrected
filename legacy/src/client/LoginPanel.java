package client;
import java.awt.*;
import java.awt.event.*;

public class LoginPanel extends Panel implements ActionListener, IListener
{
    private String m_connectionStatusMsg;
    private GamePanel m_pnlGame;
    private IListener m_listener;
    public TextField m_tfUsername;
    public TextField m_tfPassword;
    public CFButton m_cfBtnLogin;
    
    public void setConnectionStatus(final String connectionStatusMsg) {
        this.m_connectionStatusMsg = connectionStatusMsg;
        this.repaint();
    }
    
    public String getConnectionStatus() {
        return this.m_connectionStatusMsg;
    }
    
    public void fireEvent(final Object o, final Object o2) {
        if (this.m_listener != null) {
            this.m_listener.fireEvent(this, null);
        }
    }
    
    public void setLoginEnabled(final boolean enabled) {
        this.m_tfUsername.setEnabled(enabled);
        this.m_tfPassword.setEnabled(enabled);
        this.m_cfBtnLogin.setEnabled(enabled);
        if (enabled) {
            this.m_tfPassword.setText("");
        }
        this.m_tfUsername.transferFocus();
    }
    
    public LoginPanel(final GamePanel pnlGame, final IListener listener) {
        this.m_connectionStatusMsg = "";
        this.setLayout(null);
        this.m_listener = listener;
        this.m_pnlGame = pnlGame;
        this.m_tfUsername = new TextField(20);
        this.m_tfPassword = new TextField(20);
        this.add(this.m_tfUsername);
        this.add(this.m_tfPassword);
        this.m_tfUsername.addActionListener(this);
        this.m_tfPassword.addActionListener(this);
        this.m_tfPassword.setEchoChar('*');
        this.add(this.m_cfBtnLogin = CFSkin.getSkin().generateCFButton("Login", this, 0));
    }
    
    public void paint(final Graphics graphics) {
        CFSkin.getSkin().paintLoginPanel(graphics, this);
    }
    
    public void doOneCycle() {
        this.repaint();
    }
    
    public String getPassword() {
        return this.m_tfPassword.getText();
    }
    
    public String getUsername() {
        return this.m_tfUsername.getText();
    }
    
    public void update(final Graphics graphics) {
        this.paint(graphics);
    }
    
    public void actionPerformed(final ActionEvent actionEvent) {
        if ((actionEvent.getSource() == this.m_tfUsername || actionEvent.getSource() == this.m_tfPassword) && this.m_listener != null) {
            if (!this.isVisible()) {
                this.getParent().requestFocus();
                return;
            }
            this.m_listener.fireEvent(this, null);
        }
    }
}

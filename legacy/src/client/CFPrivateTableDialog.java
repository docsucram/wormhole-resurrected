package client;
import java.awt.*;
import java.awt.event.*;

public class CFPrivateTableDialog extends Dialog implements IListener, WindowListener, ActionListener
{
    public TextField m_tfPassword;
    public CFButton m_cfBtnOK;
    public CFButton m_cfBtnCancel;
    private boolean m_bOK;
    private IListener m_listener;
    private CFTableElement m_tableElement;
    private String m_stringStatus;
    private boolean m_bTableDeleted;
    
    public void fireEvent(final Object o, final Object o2) {
        if (o == this.m_cfBtnOK) {
            if (this.m_tfPassword.getText().length() == 0) {
                this.setStatus("Please enter password.");
                return;
            }
            if (this.m_listener != null) {
                this.m_listener.fireEvent(this, this.m_tfPassword.getText());
            }
        }
        else if (o == this.m_cfBtnCancel) {
            this.handleClosing();
        }
    }
    
    public CFPrivateTableDialog(final Frame frame, final IListener listener, final CFTableElement tableElement) {
        super(frame, "Join Table: " + tableElement.getTableID(), true);
        this.m_stringStatus = "";
        this.setLayout(null);
        super.setResizable(false);
        this.m_listener = listener;
        this.m_tableElement = tableElement;
        GamePanel.g_vDialogs.addElement(this);
        (this.m_tfPassword = new TextField(15)).addActionListener(this);
        this.m_cfBtnCancel = CFSkin.getSkin().generateCFButton("Cancel", this, 8);
        this.m_cfBtnOK = CFSkin.getSkin().generateCFButton("OK", this, 8);
        this.add(this.m_tfPassword);
        this.add(this.m_cfBtnOK);
        this.add(this.m_cfBtnCancel);
        this.addWindowListener(this);
    }
    
    public void windowDeactivated(final WindowEvent windowEvent) {
    }
    
    public void setTableRemoved() {
        this.m_bTableDeleted = true;
        this.m_tfPassword.setVisible(false);
        this.m_cfBtnOK.setVisible(false);
        this.repaint();
    }
    
    public void paint(final Graphics graphics) {
        CFSkin.getSkin().paintCFPrivateTableDialog(graphics, this);
    }
    
    public void windowClosing(final WindowEvent windowEvent) {
        this.handleClosing();
    }
    
    public void handleClosing() {
        GamePanel.g_vDialogs.removeElement(this);
        this.dispose();
    }
    
    public String getPassword() {
        return this.m_tfPassword.getText();
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
        if (actionEvent.getSource() == this.m_tfPassword) {
            if (this.m_tfPassword.getText().length() == 0) {
                this.setStatus("Please enter password.");
                return;
            }
            if (this.m_listener != null) {
                this.m_listener.fireEvent(this, this.m_tfPassword.getText());
            }
        }
    }
    
    public boolean isTableDeleted() {
        return this.m_bTableDeleted;
    }
    
    public void setStatus(final String stringStatus) {
        this.m_stringStatus = stringStatus;
        this.repaint();
    }
    
    public int getTableID() {
        return this.m_tableElement.getTableID();
    }
    
    public String getStatus() {
        return this.m_stringStatus;
    }
    
    public boolean ok() {
        return this.m_bOK;
    }
    
    public void windowIconified(final WindowEvent windowEvent) {
    }
}

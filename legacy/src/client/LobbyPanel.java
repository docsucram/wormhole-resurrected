package client;
import java.util.*;
import java.awt.*;

public class LobbyPanel extends Panel implements IListener
{
    private IListener m_listener;
    private String m_username;
    public CFTablePanel m_cfTablePanel;
    public CFPlayerPanel m_cfPlayerPanel;
    public CFChatPanel m_cfChatPanel;
    public CFButton m_cfBtnLogout;
    public CFButton m_cfBtnCreateTable;
    public CFButton m_cfBtnCreateTableOptions;
    private Vector m_vURLButtons;
    
    public CFButton getCreateTableOptionsButton() {
        return this.m_cfBtnCreateTableOptions;
    }
    
    public void addURLButton(final CFButton cfButton) {
        this.m_vURLButtons.addElement(cfButton);
        this.add(cfButton);
    }
    
    public void fireEvent(final Object o, final Object o2) {
        if (this.m_vURLButtons.contains(o)) {
            ((CFButton)o).openURLPage();
        }
    }
    
    public CFChatPanel getChatPanel() {
        return this.m_cfChatPanel;
    }
    
    public CFTablePanel getTablePanel() {
        return this.m_cfTablePanel;
    }
    
    public LobbyPanel(final IListener listener) {
        this.m_vURLButtons = new Vector();
        this.setLayout(null);
        final CFSkin skin = CFSkin.getSkin();
        this.m_cfTablePanel = skin.generateCFTablePanel(listener);
        this.m_cfPlayerPanel = skin.generateCFPlayerPanel(listener);
        this.m_cfChatPanel = skin.generateCFChatPanel(listener);
        this.add(this.m_cfTablePanel);
        this.add(this.m_cfPlayerPanel);
        this.add(this.m_cfChatPanel);
        this.m_cfBtnLogout = skin.generateCFButton("Logout", listener, 1);
        this.m_cfBtnCreateTable = skin.generateCFButton("Create Table", listener, 3);
        this.m_cfBtnCreateTableOptions = skin.generateCFButton("Create Table Options", listener, 4);
        this.add(this.m_cfBtnLogout);
        this.add(this.m_cfBtnCreateTable);
        this.add(this.m_cfBtnCreateTableOptions);
        this.m_listener = listener;
    }
    
    public void paint(final Graphics graphics) {
        CFSkin.getSkin().paintLobbyPanel(graphics, this);
    }
    
    public CFButton getLogoutButton() {
        return this.m_cfBtnLogout;
    }
    
    public CFButton getCreateTableButton() {
        return this.m_cfBtnCreateTable;
    }
    
    public void setUsername(final String username) {
        this.m_username = username;
    }
    
    public String getUsername() {
        return this.m_username;
    }
    
    public void update(final Graphics graphics) {
        this.paint(graphics);
    }
    
    public Vector getURLButtons() {
        return this.m_vURLButtons;
    }
    
    public CFPlayerPanel getPlayerPanel() {
        return this.m_cfPlayerPanel;
    }
}

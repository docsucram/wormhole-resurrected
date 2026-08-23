package client;
import java.util.*;
import javax.swing.*;
import java.awt.*;

public class GamePanel extends Panel
{
    private CardLayout m_cardLayout;
    private LobbyPanel m_pnlLobby;
    private LoginPanel m_pnlLogin;
    private PlayingPanel m_pnlPlaying;
    private GameNetLogic m_netLogic;
    public static JPanel m_applet;
    public static Vector g_vDialogs;
    private long m_lastCycleStartTime;
    private long m_lastCycleEndTime;
    private CFProps m_cfProps;
    
    public GameNetLogic getNetLogic() {
        return this.m_netLogic;
    }
    
    //public GamePanel(final Properties properties, final Applet applet, final int n, final int n2) {
    public GamePanel(final Properties properties, final JPanel applet, final int n, final int n2) {
        this.m_cardLayout = new CardLayout();
        this.setSize(n, n2);
        GamePanel.m_applet = applet;
        this.m_cfProps = new CFProps(properties);
        this.m_netLogic = new GameNetLogic(this, this.m_cfProps);
        final CFSkin skin = new CFSkin(this.m_cfProps, this.m_netLogic);
        CFSkin.setSkin(skin);
        this.setLayout(this.m_cardLayout);
        this.add(this.m_pnlLogin = skin.generateLoginPanel(this, this.m_netLogic), "Login");
        this.showLogin();
        this.add(this.m_pnlLobby = skin.generateLobbyPanel(this.m_netLogic), "Lobby");
        this.add(this.m_pnlPlaying = skin.generatePlayingPanel(this, this.m_netLogic), "Playing");
    }
    
    public void showLogin() {
        this.m_pnlLogin.setEnabled(true);
        synchronized (GamePanel.g_vDialogs) {
            for (int i = 0; i < GamePanel.g_vDialogs.size(); ++i) {
                ((Dialog)GamePanel.g_vDialogs.elementAt(i)).dispose();
            }
        }
        // monitorexit(GamePanel.g_vDialogs)
        this.m_cardLayout.show(this, "Login");
        this.m_pnlLogin.m_tfUsername.transferFocus();
    }
    
    public void doOneCycle() {
        try {
            if (this.m_pnlPlaying.isVisible()) {
            	long lastCycleDuration = (m_lastCycleEndTime - m_lastCycleStartTime) / 1000000;
	            long millisDelay = 21 - lastCycleDuration;
	            if (millisDelay < 0) millisDelay = 0;
	            Thread.sleep(millisDelay);
                
	            m_lastCycleStartTime = System.nanoTime();
                this.m_pnlPlaying.doOneCycle();
            }
            else if (this.m_pnlLogin.isVisible()) {
                this.m_pnlLogin.doOneCycle();
                Thread.sleep(50L);
            }
            else {
                Thread.sleep(50L);
            }
            this.m_netLogic.doOneCycle();
            m_lastCycleEndTime = System.nanoTime();
        }
        catch (Exception ex) {}
    }
    
    public void update(final Graphics graphics) {
        this.paint(graphics);
    }
    
    public LobbyPanel getLobbyPanel() {
        return this.m_pnlLobby;
    }
    
    static {
        GamePanel.g_vDialogs = new Vector();
    }
    
    public void showLobby() {
        this.m_cardLayout.show(this, "Lobby");
    }
    
    public void showGame() {
        this.m_cardLayout.show(this, "Playing");
    }
    
    public void stopThreads() {
        if (this.m_netLogic != null) {
            this.m_netLogic.disconnect("Exitted Game");
        }
    }
    
    public void doLayout() {
        super.doLayout();
        final Dimension size = this.getSize();
        this.m_pnlLobby.setBounds(0, 0, size.width, size.height);
        this.m_pnlLogin.setBounds(0, 0, size.width, size.height);
        this.m_pnlPlaying.setBounds(0, 0, size.width, size.height);
        this.repaint();
    }
    
    public CFProps getProps() {
        return this.m_cfProps;
    }
    
    public LoginPanel getLoginPanel() {
        return this.m_pnlLogin;
    }
    
    public PlayingPanel getPlayingPanel() {
        return this.m_pnlPlaying;
    }
}

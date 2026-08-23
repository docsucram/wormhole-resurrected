package client;
import java.util.*;
import java.awt.*;

public class PlayingPanel extends Panel implements IListener
{
    private GamePanel m_pnlGame;
    private IListener m_listener;
    public CFChatPanel m_cfChatPanel;
    public CFButton m_cfBtnLeaveTable;
    public CFButton m_cfBtnStartGame;
    public CFButton m_cfBtnSoundToggle;
    public GameBoard m_cfGameBoard;
    public CreditsPanel m_pnlCredits;
    private Vector m_vURLButtons;
    public CFTableElement m_tableElement;
    private String m_username;
    private String m_password;
    private int m_countdown;
    private boolean m_bCountdown;
    
    public void setTable(final CFTableElement cfTableElement) {
        this.m_tableElement = cfTableElement;
        this.m_cfGameBoard.setTable(cfTableElement);
        this.repaint();
    }
    
    public String getTablePassword() {
        return this.m_password;
    }
    
    public void addURLButton(final CFButton cfButton) {
        this.add(cfButton);
        this.m_vURLButtons.addElement(cfButton);
        this.repaint();
    }
    
    public CFButton getLeaveTableButton() {
        return this.m_cfBtnLeaveTable;
    }
    
    public void fireEvent(final Object o, final Object o2) {
        if (this.m_vURLButtons.contains(o)) {
            ((CFButton)o).openURLPage();
        }
    }
    
    public CFChatPanel getChatPanel() {
        return this.m_cfChatPanel;
    }
    
    public PlayingPanel(final GamePanel pnlGame, final IListener listener) {
        this.m_vURLButtons = new Vector();
        this.setLayout(null);
        this.m_listener = listener;
        this.m_pnlGame = pnlGame;
        final CFSkin skin = CFSkin.getSkin();
        this.add(this.m_cfChatPanel = skin.generateCFChatPanel(listener));
        this.add(this.m_cfBtnLeaveTable = skin.generateCFButton("Leave Table", listener, 6));
        this.add(this.m_cfBtnSoundToggle = skin.generateCFButton("Sound on", listener, 2));
        this.add(this.m_cfBtnStartGame = skin.generateCFButton("Start Game", listener, 5));
        this.add(this.m_cfGameBoard = new GameBoard(pnlGame.getProps(), pnlGame.getNetLogic(), GameLoader.g_mediaElements));
        this.add(this.m_pnlCredits = new CreditsPanel());
    }
    
    public void paint(final Graphics graphics) {
        super.paint(graphics);
        CFSkin.getSkin().paintPlayingPanel(graphics, this);
    }
    
    public void doOneCycle() {
        this.m_cfGameBoard.doOneCycle();
    }
    
    public CFButton getStartGameButton() {
        return this.m_cfBtnStartGame;
    }
    
    public String getUsername() {
        return this.m_username;
    }
    
    public CFTableElement getTableElement() {
        return this.m_tableElement;
    }
    
    public void update(final Graphics graphics) {
        this.paint(graphics);
    }
    
    public GameBoard getGameBoard() {
        return this.m_cfGameBoard;
    }
    
    public Vector getURLButtons() {
        return this.m_vURLButtons;
    }
    
    public CFButton getSoundButton() {
        return this.m_cfBtnSoundToggle;
    }
    
    public CreditsPanel getCreditsPanel() {
        return this.m_pnlCredits;
    }
    
    public void setTableInfo(final String username, final String password) {
        this.m_username = username;
        this.m_password = password;
    }
    
    public void setInCountdown(final boolean bCountdown, final int countdown) {
        this.m_bCountdown = bCountdown;
        this.m_countdown = countdown;
    }
}

package client;
import java.awt.*;
import java.awt.event.*;

public class CFTableDialog extends Dialog implements IListener, WindowListener, ActionListener, ItemListener
{
    public Checkbox m_cbRanking;
    public TextField m_tfPassword;
    public CFButton m_cfBtnOK;
    public CFButton m_cfBtnCancel;
    public Choice m_choiceBoardSize;
    public Checkbox m_cbBigTable;
    public Checkbox m_cbBalancedTeams;
    public Checkbox m_cbTeams;
    public Checkbox m_cbAllShips;
    public Checkbox m_cbAllPowerups;
    private IListener m_listener;
    private boolean m_bOK;
    
    public void fireEvent(final Object o, final Object o2) {
        if (o == this.m_cfBtnOK) {
            this.m_bOK = true;
        }
        this.handleClosing();
    }
    
    public CFTableDialog(final Frame frame) {
        super(frame, "Create Table", true);
        this.setLayout(null);
        super.setResizable(false);
        GamePanel.g_vDialogs.addElement(this);
        this.m_cbRanking = CFSkin.getSkin().generateCheckBox("Ranked Table", true);
        (this.m_cbBigTable = CFSkin.getSkin().generateCheckBox("Huge Table", false)).setEnabled(true);
        this.add(this.m_cbBigTable);
        (this.m_cbBalancedTeams = CFSkin.getSkin().generateCheckBox("Balanced Teams", false)).setEnabled(false);
        this.add(this.m_cbBalancedTeams);
        (this.m_cbTeams = CFSkin.getSkin().generateCheckBox("Team Game", false)).addItemListener(this);
        this.m_cbTeams.setEnabled(true);
        this.add(this.m_cbTeams);
        (this.m_cbAllShips = CFSkin.getSkin().generateCheckBox("All Ships", false)).setEnabled(true);
        this.add(this.m_cbAllShips);
        (this.m_cbAllPowerups = CFSkin.getSkin().generateCheckBox("All Powerups", false)).setEnabled(true);
        this.add(this.m_cbAllPowerups);
        (this.m_choiceBoardSize = CFSkin.getSkin().generateChoice()).setEnabled(true);
        this.add(this.m_choiceBoardSize);
        this.m_choiceBoardSize.select(3);	// Default to large board, which is the size of classic 4-player wormhole
        this.m_cfBtnOK = CFSkin.getSkin().generateCFButton("Create", this, 8);
        this.m_cfBtnCancel = CFSkin.getSkin().generateCFButton("Cancel", this, 8);
        (this.m_tfPassword = new TextField(15)).addActionListener(this);
        this.add(this.m_tfPassword);
        this.add(this.m_cbRanking);
        this.add(this.m_cfBtnOK);
        this.add(this.m_cfBtnCancel);
        this.addWindowListener(this);
    }
    
    public void windowDeactivated(final WindowEvent windowEvent) {
    }
    
    public void itemStateChanged(final ItemEvent itemEvent) {
        final boolean enabled = this.m_cbTeams.getState();
        this.m_cbBalancedTeams.setEnabled(enabled);
        if (!enabled) {
            this.m_cbBalancedTeams.setState(false);
            return;
        }
    }
    
    public void paint(final Graphics graphics) {
        CFSkin.getSkin().paintCFTableDialog(graphics, this);
    }
    
    public void windowClosing(final WindowEvent windowEvent) {
        this.handleClosing();
    }
    
    private void handleClosing() {
        GamePanel.g_vDialogs.removeElement(this);
        this.dispose();
    }
    
    public boolean isBalancedTable() {
        return this.m_cbBalancedTeams.getState();
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
        if (actionEvent.getSource() != null) {
            this.m_bOK = true;
            this.handleClosing();
        }
    }
    
    public boolean isRanked() {
        return this.m_cbRanking.getState();
    }
    
    public boolean isBigTable() {
        return this.m_cbBigTable.getState();
    }
    
    public boolean allShips() {
        return this.m_cbAllShips.getState();
    }
    
    public boolean allPowerups() {
        return this.m_cbAllPowerups.getState();
    }
    
    public void setListener(final IListener listener) {
        this.m_listener = listener;
    }
    
    public int getBoardSize() {
        final String selectedItem = this.m_choiceBoardSize.getSelectedItem();
        if (selectedItem == null) {
            return 0;
        }
        for (int i = 0; i < CFSkin.STR_TEAMS.length; ++i) {
            if (CFSkin.STR_TEAMS[i].equals(selectedItem)) {
                return i;
            }
        }
        return 0;
    }
    
    public boolean ok() {
        return this.m_bOK;
    }
    
    public void windowIconified(final WindowEvent windowEvent) {
    }
    
    public boolean isTeamTable() {
    	return this.m_cbTeams.getState();
    }
}

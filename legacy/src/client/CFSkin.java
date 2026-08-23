package client;
import java.awt.event.*;
import java.awt.image.*;
import java.util.*;
import java.awt.*;

public class CFSkin extends MouseAdapter
{
    private static final Font FONTSMALL;
    private static final Font FONTNORMAL;
    private static final Font FONTELEMENT;
    private static final Font FONTELEMENT_TITLE;
    public static final String[] STR_TEAMS;
    public static final String[] STR_TEAMS_SHORT;
    public static final Color[] TEAM_COLORS;
    public static final Color[] TEAM_BG_COLORS;
    public static final String[] TEAM_NAMES;
    public static CFSkin g_instance;
    private CFProps m_cfProps;
    private GameNetLogic m_logic;
    private Color m_clrGuestPlayerElement;
    private Color m_clrRegisteredPlayerElement;
    private Color m_clrError;
    private Color m_clrInstructions;
    private Color m_clrDefaultText;
    private Color m_clrPanelText;
    private Color m_clrButtonDefault;
    private Color m_clrButtonRollover;
    private Color m_clrLobbyTableOpen;
    private Color m_clrLobbyTableOpenTxt;
    private Color m_clrLobbyTableFilled;
    private Color m_clrLobbyTableFilledTxt;
    private Graphics m_loginOffScreenG;
    private Image m_loginOffScreen;
    private int timer;
    private int timer2;
    private int titleCounter;
    private int r2Counter;
    private Color m_clrForeground;
    private Color m_clrBackground;
    private Color m_clrWhoMe;
    private Color m_clrWhoOther;
    private static final Color COLOR_LOGIN_LINES;
    private Color[] g_set_external;
    private Color[] g_set_internal;
    private Color[] g_set_player;
    private static final int kOFFSETX = 1;
    private static final int kOFFSETX2 = 2;
    private static final int kOFFSETY = 2;
    private static final int MAX_PLAYER_NAME_LENGTH = 9;
    private static final int PLAYER_NAME_X = 35;
    private static final int CLAN_NAME_X = 3;
    private static final int TABLE_NAME_X = 108;
    private static final int RANK_NAME_X = 162;
    private static final int boxX = 9;
    private static final int boxY = 30;
    private static final Rectangle m_rectCFPD_Icons;
    private static final Rectangle m_rectCFPD_Clan;
    private static final int fudgeY = -2;
    private static final int fudgeX = 2;
    private static final int HORZ = 0;
    private static final int VERT = 1;
    private static final Color g_loginColor;
    private static final int TABLE_BORDERSIZE = 2;
    private static final int TABLE_LEFTWIDTH = 110;
    private static final int TABLE_LABELY = 10;
    private static final int TABLE_BTNX = 8;
    private static final int TABLE_BTNY = 5;
    private static final int TABLE_BTNW = 98;
    private static final int TABLE_BTNH = 16;
    
    public CFPlayerDialog generateCFPlayerDialog(final Frame frame, final CFPlayerElement cfPlayerElement, final IListener listener, final GameNetLogic gameNetLogic, final Point point) {
        final CFPlayerDialog colors = new CFPlayerDialog(frame, listener, cfPlayerElement, gameNetLogic);
        final Rectangle rect = this.m_cfProps.getRect("player_dialog");
        colors.setSize(rect.width, rect.height);
        colors.setLocation(point.x + rect.x, point.y + rect.y);
        this.setColors(colors);
        colors.m_tfWhisper.setBackground(Color.white);
        colors.m_tfWhisper.setForeground(Color.black);
        colors.m_tfWhisper.setFont(CFSkin.FONTNORMAL);
        this.setColors(colors.m_cfBtnWhisper);
        this.setColors(colors.m_cfBtnClose);
        this.setColors(colors.m_cfBtnOpenGameCard);
        colors.m_tfWhisper.setBounds(this.m_cfProps.getRect("player_dialog_tf_whisper"));
        colors.m_cfBtnWhisper.setBounds(this.m_cfProps.getRect("player_dialog_btn_send"));
        colors.m_cfBtnOpenGameCard.setBounds(this.m_cfProps.getRect("player_dialog_btn_view"));
        colors.m_cfBtnClose.setBounds(this.m_cfProps.getRect("player_dialog_btn_close"));
        colors.m_cbIgnored.setBounds(this.m_cfProps.getRect("player_dialog_cb_ignore"));
        colors.addMouseListener(this);
        return colors;
    }
    
    public void paintCFPlayerDialog(final Graphics graphics, final CFPlayerDialog cfPlayerDialog) {
        this.defaultPaintCFPlayerDialog(graphics, cfPlayerDialog);
    }
    
    public void defaultPaintCFTableDialog(final Graphics graphics, final CFTableDialog cfTableDialog) {
        graphics.setColor(cfTableDialog.getForeground());
        graphics.setFont(CFSkin.FONTNORMAL);
        int pwTextXPos = this.m_cfProps.getRect("table_dialog_tf_password").x + 3;
        int pwTextYPos = this.m_cfProps.getRect("table_dialog_tf_password").y - 5;
        graphics.drawString("Password (Optional)", pwTextXPos, pwTextYPos);
        if (!cfTableDialog.m_cbBigTable.isEnabled()) {
            graphics.drawString("Sign up for the team plan to access more options.", 10, cfTableDialog.m_cfBtnOK.getLocation().y + cfTableDialog.m_cfBtnOK.getSize().height + 14);
        }
    }
    
    public void defaultPaintCFPrivateTableDialog(final Graphics graphics, final CFPrivateTableDialog cfPrivateTableDialog) {
        graphics.setColor(cfPrivateTableDialog.getForeground());
        graphics.setFont(CFSkin.FONTNORMAL);
        if (cfPrivateTableDialog.isTableDeleted()) {
            graphics.drawString("Table was deleted!", 25, 55);
        }
        else {
            graphics.drawString("Enter Password:", 10, 50);
        }
        graphics.setColor(this.m_clrError);
        graphics.drawString(cfPrivateTableDialog.getStatus(), 10, 113);
    }
    
    public LoginPanel generateLoginPanel(final GamePanel gamePanel, final IListener listener) {
        final LoginPanel colors = new LoginPanel(gamePanel, listener);
        colors.setSize(gamePanel.getSize());
        this.setColors(colors);
        colors.m_tfUsername.setBounds(this.m_cfProps.getRect("loginpanel_tf_username"));
        colors.m_tfUsername.setForeground(Color.black);
        colors.m_tfUsername.setBackground(Color.white);
        colors.m_tfPassword.setBounds(this.m_cfProps.getRect("loginpanel_tf_password"));
        colors.m_tfPassword.setForeground(Color.black);
        colors.m_tfPassword.setBackground(Color.white);
        colors.m_cfBtnLogin.setBounds(this.m_cfProps.getRect("loginpanel_btn_login"));
        colors.m_cfBtnLogin.setBackground(Color.gray);
        return colors;
    }
    
    public PlayingPanel generatePlayingPanel(final GamePanel gamePanel, final IListener listener) {
        final PlayingPanel colors = new PlayingPanel(gamePanel, listener);
        this.setColors(colors);
        colors.setSize(gamePanel.getSize());
        colors.m_cfChatPanel.setBounds(this.m_cfProps.getRect("playingpanel_chatpanel"));
        colors.m_cfBtnLeaveTable.setBounds(this.m_cfProps.getRect("playingpanel_btn_leavetable"));
        colors.m_cfBtnStartGame.setBounds(this.m_cfProps.getRect("playingpanel_btn_startgame"));
        colors.m_cfBtnSoundToggle.setBounds(this.m_cfProps.getRect("playingpanel_btn_soundtoggle"));
        colors.m_cfGameBoard.setBounds(this.m_cfProps.getRect("playingpanel_gameboard"));
        colors.m_pnlCredits.setBounds(this.m_cfProps.getRect("playingpanel_credits"));
        this.addURLButton("playingpanel_btn", colors);
        return colors;
    }
    
    private Color[] getColorSet(final String s) {
        final Color[] array = new Color[3];
        int n = 0;
        do {
            array[n] = this.m_cfProps.getColor(s + n);
        } while (++n < 3);
        return array;
    }
    
    public CFChatPanel generateCFChatPanel(final IListener listener) {
        final CFChatPanel colors = new CFChatPanel(listener, this.m_cfProps.getInt("chatpanel_max_lines", 50), this.m_cfProps.getInt("chatpanel_tf_height", 20));
        this.setColors(colors);
        colors.m_tfChat.setForeground(Color.black);
        colors.m_tfChat.setBackground(Color.white);
        colors.m_tfChat.setFont(CFSkin.FONTNORMAL);
        colors.setGutters(this.m_cfProps.getRect("cfchatpanel_gutter"));
        return colors;
    }
    
    public CFTablePanel generateCFTablePanel(final IListener listener) {
        final CFTablePanel colors = new CFTablePanel(listener);
        this.setColors(colors);
        colors.setAlignment(0);
        colors.setYBuffer(1);
        colors.setGutters(this.m_cfProps.getRect("cftablepanel_gutter"));
        return colors;
    }
    
    public void paintLoginPanel(final Graphics graphics, final LoginPanel loginPanel) {
        this.defaultPaintLoginPanel(graphics, loginPanel);
    }
    
    public void paintPlayingPanel(final Graphics graphics, final PlayingPanel playingPanel) {
        this.defaultPaintPlayingPanel(graphics, playingPanel);
    }
    
    public void paintCFChatPanel(final Graphics graphics, final CFChatPanel cfChatPanel) {
        this.defaultPaintCFChatPanel(graphics, cfChatPanel);
    }
    
    public void prePaintCFChatPanel(final Graphics graphics, final CFChatPanel cfChatPanel) {
        this.defaultPrePaintCFChatPanel(graphics, cfChatPanel);
    }
    
    public void paintCFTablePanel(final Graphics graphics, final CFTablePanel cfTablePanel) {
        this.defaultPaintCFTablePanel(graphics, cfTablePanel);
    }
    
    public void prePaintCFTablePanel(final Graphics graphics, final CFTablePanel cfTablePanel) {
        this.defaultPrePaintCFTablePanel(graphics, cfTablePanel);
    }
    
    public void defaultPrePaintCFPlayerPanel(final Graphics graphics, final CFPlayerPanel cfPlayerPanel) {
        this.shadeInternals(graphics, cfPlayerPanel, null);
    }
    
    public void defaultPaintCFPlayerPanel(final Graphics graphics, final CFPlayerPanel cfPlayerPanel) {
        graphics.setFont(CFSkin.FONTELEMENT_TITLE);
        graphics.setColor(this.m_clrPanelText);
        final Rectangle innerBounds = cfPlayerPanel.getInnerBounds();
        final int n = innerBounds.y - 6;
        graphics.drawString("Clan", innerBounds.x + 3 - 2, n);
        graphics.drawString("User", innerBounds.x + 35, n);
        graphics.drawString("Table", innerBounds.x + 108, n);
        graphics.drawString("Rank", innerBounds.x + 162, n);
        final int n2 = innerBounds.y + innerBounds.height + 15;
        graphics.drawString("Ranking Key:", innerBounds.x, n2);
        final int n3 = n2 + 3;
        final int x = innerBounds.x;
        final int n4 = n3 + 15;
        final int n5 = x + 90;
        final int n6 = 10;
        final int n7 = 16;
        this.drawRankSquare(graphics, x, n3, 4000);
        graphics.setColor(this.m_clrPanelText);
        graphics.drawString("3000+", x + n7, n3 + n6);
        this.drawRankSquare(graphics, n5, n3, 2000);
        graphics.setColor(this.m_clrPanelText);
        graphics.drawString("2000-2999", n5 + n7, n3 + n6);
        this.drawRankSquare(graphics, x, n4, 1000);
        graphics.setColor(this.m_clrPanelText);
        graphics.drawString("1000-1999", x + n7, n4 + n6);
        this.drawRankSquare(graphics, n5, n4, 0);
        graphics.setColor(this.m_clrPanelText);
        graphics.drawString("0-999", n5 + n7, n4 + n6);
    }
    
    public void mouseReleased(final MouseEvent mouseEvent) {
        if (CFSkin.m_rectCFPD_Clan.contains(mouseEvent.getX(), mouseEvent.getY())) {
            final String clan = ((CFPlayerDialog)mouseEvent.getSource()).getCFPlayerElement().getClan();
            if (clan.length() > 0) {
                //Util.openPage(this.m_cfProps.getString("player_dialog_clan_URL" + clan, ""), 300, 300, "Wormhole Clans");
            }
        }
    }
    
    public void defaultPaintLobbyPanel(final Graphics graphics, final LobbyPanel lobbyPanel) {
        this.shadeArea(graphics, lobbyPanel.getSize().width, lobbyPanel.getSize().height, lobbyPanel.getBackground(), lobbyPanel.getForeground(), Color.black, 2, 0, 0);
        graphics.setFont(CFSkin.FONTNORMAL);
        graphics.setColor(this.m_clrDefaultText);
        graphics.drawString("User: " + lobbyPanel.getUsername(), 10, 20);
        graphics.drawString("Players", lobbyPanel.getPlayerPanel().getLocation().x + 5, lobbyPanel.getPlayerPanel().getLocation().y - 5);
        graphics.drawString("Tables", lobbyPanel.getTablePanel().getLocation().x + 5, lobbyPanel.getTablePanel().getLocation().y - 5);
        graphics.drawString("Chat", lobbyPanel.getChatPanel().getLocation().x + 5, lobbyPanel.getChatPanel().getLocation().y - 5);
    }
    
    private void defaultPaintButton(final Graphics graphics, final CFButton cfButton) {
        final Dimension size = cfButton.getSize();
        graphics.setColor(cfButton.getBackground());
        graphics.fillRect(0, 0, size.width, size.height);
        switch (cfButton.getState()) {
            case 0: {
                graphics.setColor((cfButton.getButtonType() == 0) ? Color.lightGray : this.m_clrButtonDefault);
                graphics.drawRoundRect(0, 0, size.width - 1, size.height - 1, 15, 15);
                break;
            }
            case 1:
            case 2: {
                graphics.setColor((cfButton.getButtonType() == 0) ? Color.white : this.m_clrButtonRollover);
                graphics.drawRoundRect(0, 0, size.width - 1, size.height - 1, 15, 15);
                break;
            }
        }
        if (cfButton.getText() != null) {
            graphics.setFont(cfButton.getFont());
            final FontMetrics fontMetrics = graphics.getFontMetrics();
            final int stringWidth = fontMetrics.stringWidth(cfButton.getText());
            final int maxAscent = fontMetrics.getMaxAscent();
            graphics.drawString(cfButton.getText(), (size.width - stringWidth) / 2 + 2, -2 + maxAscent + (size.height - maxAscent) / 2);
        }
    }
    
    public Checkbox generateCheckBox(final String s, final boolean state) {
        final Checkbox colors = new Checkbox(s, state);
        colors.setFont(CFSkin.FONTNORMAL);
        this.setColors(colors);
        colors.setState(state);
        return colors;
    }
    
    public CFTableElement generateCFTableElement(final IListener listener, final int n, final int n2, final int n3) {
        final CFTableElement cfTableElement = new CFTableElement(listener, n, n3);
        cfTableElement.setForeground(this.m_clrForeground);
        cfTableElement.setBackground(this.m_clrBackground);
        cfTableElement.setSize(n2 - 2, 38);
        return cfTableElement;
    }
    
    public CFChatElement generateCFChatElement(final IListener listener, final String s, final String s2, final String s3, final int n, final Color color) {
        final CFChatElement cfChatElement = new CFChatElement(listener, CFSkin.FONTNORMAL, s, s2, s3, n);
        cfChatElement.setForeground((color != null) ? color : this.m_clrForeground);
        cfChatElement.setBackground(this.g_set_internal[0]);
        cfChatElement.setWhoColor(this.m_clrWhoMe);
//        if (s2 != null && s2.equals(this.m_logic.getUsername())) {
//            cfChatElement.setWhoColor(this.m_clrWhoMe);
//        }
//        else {
//            cfChatElement.setWhoColor(this.m_clrWhoOther);
//        }
        return cfChatElement;
    }
    
    public void paintCFTableElement(final Graphics graphics, final CFTableElement cfTableElement) {
        this.defaultPaintCFTableElement(graphics, cfTableElement);
    }
    
    public void paintCFChatElement(final Graphics graphics, final CFChatElement cfChatElement) {
        this.defaultPaintCFChatElement(graphics, cfChatElement);
    }
    
    public void defaultPaintCFPlayerElement(final Graphics graphics, final CFPlayerElement cfPlayerElement) {
        this.shadeArea(graphics, cfPlayerElement.getWidth() - 2, cfPlayerElement.getHeight() - 2, this.g_set_player, 1, 0, 2);
        graphics.setFont(CFSkin.FONTELEMENT);
        graphics.setColor(cfPlayerElement.isGuest() ? this.m_clrGuestPlayerElement : this.m_clrRegisteredPlayerElement);
        String s = cfPlayerElement.getName();
        if (s.length() > 9) {
            s = s.substring(0, 9) + "...";
        }
        graphics.drawString(cfPlayerElement.getClan(), 3, cfPlayerElement.getHeight() - 4);
        graphics.drawString(s, 35, cfPlayerElement.getHeight() - 4);
        graphics.drawString((cfPlayerElement.getTableID() < 0) ? "--" : ("" + cfPlayerElement.getTableID()), 120, cfPlayerElement.getHeight() - 4);
        if (!cfPlayerElement.isGuest() && cfPlayerElement.getRank() > -1) {
            final String[] icons = cfPlayerElement.getIcons();
            final int n = 175 - (Math.min(icons.length, 3) + 1) * 14 / 2;
            this.drawRankSquare(graphics, n, 4, cfPlayerElement.getRank());
            this.drawIcons(graphics, icons, n + 14, 4, 14, 3);
        }
    }
    
    public String[][] getTableOptions(final CFTableDialog cfTableDialog) {
        return null;
    }
    
    public void addInstructions(final CFChatPanel cfChatPanel) {
        this.defaultAddInstructions(cfChatPanel, "instr", false);
    }
    
    public void defaultAddInstructions(final CFChatPanel cfChatPanel, final String s, final boolean b) {
        int n = 0;
        Color color = this.m_clrInstructions;
        while (true) {
            final String string = this.m_cfProps.getString(s + n, null);
            if (string == null) {
                break;
            }
            if (b) {
                switch (n) {
                    case 2: {
                        color = Color.green;
                        break;
                    }
                    case 3: {
                        color = Color.yellow;
                        break;
                    }
                    case 4: {
                        color = Color.red;
                        break;
                    }
                    default: {
                        color = Color.white;
                        break;
                    }
                }
            }
            cfChatPanel.addLine(null, null, string, color);
            ++n;
        }
        cfChatPanel.addLine(null, null, "", color); // add blank line after instructions
        cfChatPanel.addLine(null, null, "", color);
    }
    
    public GameNetLogic getLogic() {
        return this.m_logic;
    }
    
    public int getGameID() {
        return 2;
    }
    
    public CFTableDialog generateCFTableDialog(final Frame frame, final Point point) {
        final CFTableDialog colors = new CFTableDialog(frame);
        final Rectangle rect = this.m_cfProps.getRect("table_dialog");
        colors.setSize(rect.width, rect.height);
        colors.setLocation(point.x + rect.x, point.y + rect.y);
        this.setColors(colors);
        this.setColors(colors.m_tfPassword);
        colors.m_tfPassword.setFont(CFSkin.FONTNORMAL);
        colors.m_tfPassword.setForeground(Color.black);
        colors.m_tfPassword.setBackground(Color.white);
        this.setColors(colors.m_cfBtnOK);
        this.setColors(colors.m_cfBtnCancel);
        this.setColors(colors.m_cbRanking);
        this.setColors(colors.m_cbBigTable);
        this.setColors(colors.m_cbBalancedTeams);
        this.setColors(colors.m_cbTeams);
        this.setColors(colors.m_cbAllShips);
        this.setColors(colors.m_choiceBoardSize);
        colors.m_cbRanking.setBounds(this.m_cfProps.getRect("table_dialog_cb_ranking"));
        colors.m_cbBigTable.setBounds(this.m_cfProps.getRect("table_dialog_cb_bigtable"));
        //colors.m_cbBigTable.setEnabled(this.m_logic.getSubscriptionLevel() >= 2);
        colors.m_cbBigTable.setEnabled(this.m_logic.getSubscriptionLevel() >= -1);
        colors.m_cbBalancedTeams.setBounds(this.m_cfProps.getRect("table_dialog_cb_balancedteams"));
        colors.m_cbTeams.setBounds(this.m_cfProps.getRect("table_dialog_cb_teams"));
        colors.m_cbAllShips.setBounds(this.m_cfProps.getRect("table_dialog_cb_allships"));
        colors.m_cbAllPowerups.setBounds(this.m_cfProps.getRect("table_dialog_cb_allpups"));
        colors.m_choiceBoardSize.setBounds(this.m_cfProps.getRect("table_dialog_choice_boardsize"));
        colors.m_tfPassword.setBounds(this.m_cfProps.getRect("table_dialog_tf_password"));
        colors.m_cfBtnOK.setBounds(this.m_cfProps.getRect("table_dialog_btn_ok"));
        colors.m_cfBtnCancel.setBounds(this.m_cfProps.getRect("table_dialog_btn_cancel"));
        return colors;
    }
    
    public void paintCFTableDialog(final Graphics graphics, final CFTableDialog cfTableDialog) {
        this.defaultPaintCFTableDialog(graphics, cfTableDialog);
    }
    
    public void addWelcomeMessage(final CFChatPanel cfChatPanel) {
        this.defaultAddInstructions(cfChatPanel, "welcome", true);
    }
    
    public void defaultPaintCFPlayerDialog(final Graphics graphics, final CFPlayerDialog cfPlayerDialog) {
        final CFPlayerElement cfPlayerElement = cfPlayerDialog.getCFPlayerElement();
        graphics.setColor(cfPlayerDialog.getForeground());
        graphics.setFont(CFSkin.FONTNORMAL);
        if (!cfPlayerElement.getName().equals(this.m_logic.getUsername())) {
            graphics.drawString(cfPlayerDialog.isLoggedOff() ? "User logged off" : "Whisper:", 9, 84);
        }
        final int rank = cfPlayerElement.getRank();
        graphics.drawString("Clan: " + ((cfPlayerElement.getClan().length() == 0) ? "---" : cfPlayerElement.getClan()), CFSkin.m_rectCFPD_Clan.x, CFSkin.m_rectCFPD_Clan.y + 22);
        graphics.drawString("Rank: " + ((rank >= 0) ? ("" + rank) : "N/A"), CFSkin.m_rectCFPD_Icons.x, CFSkin.m_rectCFPD_Icons.y + 22);
        this.drawRankSquare(graphics, CFSkin.m_rectCFPD_Icons.x + 68, CFSkin.m_rectCFPD_Icons.y + 10, rank);
        this.drawIcons(graphics, cfPlayerElement.getIcons(), CFSkin.m_rectCFPD_Icons.x + 83, CFSkin.m_rectCFPD_Icons.y + 10, 15, 10);
    }
    
    private void shadeInternals(final Graphics graphics, final CFScroller cfScroller, final Color[] array) {
        this.shadeArea(graphics, cfScroller.getSize().width, cfScroller.getSize().height, this.g_set_external, 1, 0, 0);
        final Rectangle innerBounds = cfScroller.getInnerBounds();
        this.shadeArea(graphics, innerBounds.width + 4, innerBounds.height + 4, (array == null) ? this.g_set_internal : array, 1, innerBounds.x - 2, innerBounds.y - 2);
    }
    
    private void drawPulseHeader(final int n, final int n2, final int n3) {
        this.m_loginOffScreenG.drawLine(n, n2, n + n3, n2);
        this.m_loginOffScreenG.drawLine(n + 4, n2 - 1, n + n3 - 4, n2 - 1);
        this.m_loginOffScreenG.drawLine(n + 4, n2 + 1, n + n3 - 4, n2 + 1);
    }
    
    public short getMajorVersion() {
        return 5;
    }
    
    public CFButton generateCFButton(final String s, final IListener listener, final int n) {
        return this.defaultGenerateCFButton(s, listener, n);
    }
    
    public void paintCFButton(final Graphics graphics, final CFButton cfButton) {
        this.defaultPaintButton(graphics, cfButton);
    }
    
    private void shadeArea(final Graphics graphics, final int n, final int n2, final Color[] array, final int n3, final int n4, final int n5) {
        this.shadeArea(graphics, n, n2, array[0], array[1], array[2], n3, n4, n5);
    }
    
    private void shadeArea(final Graphics graphics, final int n, final int n2, final Color color, final Color color2, final Color color3, final int n3, final int n4, final int n5) {
        graphics.setColor(color);
        graphics.translate(n4, n5);
        graphics.fillRect(0, 0, n, n2);
        for (int i = 0; i < n3; ++i) {
            graphics.setColor(color2);
            graphics.drawRect(i, i, n - i * 2 - 1, n2 - i * 2 - 1);
            graphics.setColor(color3);
            graphics.drawLine(n - i - 1, n2 - i - 1, n - i - 1, i);
            graphics.drawLine(n - i - 1, n2 - i - 1, i, n2 - i - 1);
        }
        graphics.translate(-n4, -n5);
    }
    
    private void setColors(final Component component) {
        component.setBackground(this.m_clrBackground);
        component.setForeground(this.m_clrForeground);
    }
    
    public LobbyPanel generateLobbyPanel(final IListener listener) {
        final LobbyPanel colors = new LobbyPanel(listener);
        this.setColors(colors);
        colors.m_cfPlayerPanel.setBounds(this.m_cfProps.getRect("lobbypanel_playerpanel"));
        colors.m_cfTablePanel.setBounds(this.m_cfProps.getRect("lobbypanel_tablepanel"));
        colors.m_cfChatPanel.setBounds(this.m_cfProps.getRect("lobbypanel_chatpanel"));
        colors.m_cfBtnLogout.setBounds(this.m_cfProps.getRect("lobbypanel_btn_logout"));
        colors.m_cfBtnCreateTable.setBounds(this.m_cfProps.getRect("lobbypanel_btn_createtable"));
        colors.m_cfBtnCreateTableOptions.setBounds(this.m_cfProps.getRect("lobbypanel_btn_createtableoptions"));
        this.addURLButton("lobbypanel_btn", colors);
        return colors;
    }
    
    public CFPlayerPanel generateCFPlayerPanel(final IListener listener) {
        final CFPlayerPanel colors = new CFPlayerPanel(listener);
        this.setColors(colors);
        colors.setGutters(this.m_cfProps.getRect("cfplayerpanel_gutter"));
        return colors;
    }
    
    public void paintLobbyPanel(final Graphics graphics, final LobbyPanel lobbyPanel) {
        this.defaultPaintLobbyPanel(graphics, lobbyPanel);
    }
    
    public void prePaintCFPlayerPanel(final Graphics graphics, final CFPlayerPanel cfPlayerPanel) {
        this.defaultPrePaintCFPlayerPanel(graphics, cfPlayerPanel);
    }
    
    public void paintCFPlayerPanel(final Graphics graphics, final CFPlayerPanel cfPlayerPanel) {
        this.defaultPaintCFPlayerPanel(graphics, cfPlayerPanel);
    }
    
    private static final Color getRankColor(final int n) {
        if (n < 0) {
            return Color.gray;
        }
        if (n < 999) {
            return Color.green;
        }
        if (n < 1999) {
            return Color.blue;
        }
        if (n < 2999) {
            return Color.yellow;
        }
        return Color.red;
    }
    
    public void defaultPaintCFChatPanel(final Graphics graphics, final CFChatPanel cfChatPanel) {
        graphics.setFont(CFSkin.FONTNORMAL);
        graphics.setColor(this.m_clrPanelText);
        graphics.drawString("Say:", cfChatPanel.m_tfChat.getLocation().x - 29, cfChatPanel.m_tfChat.getLocation().y + 16);
    }
    
    public void defaultPrePaintCFChatPanel(final Graphics graphics, final CFChatPanel cfChatPanel) {
        this.shadeInternals(graphics, cfChatPanel, null);
    }
    
    public void defaultPrePaintCFTablePanel(final Graphics graphics, final CFTablePanel cfTablePanel) {
        this.shadeInternals(graphics, cfTablePanel, null);
    }
    
    public void defaultPaintCFTablePanel(final Graphics graphics, final CFTablePanel cfTablePanel) {
    }
    
    public short getMinorVersion() {
        return 4;
    }
    
    public void defaultPaintPlayingPanel(final Graphics graphics, final PlayingPanel playingPanel) {
        this.shadeArea(graphics, playingPanel.getSize().width, playingPanel.getSize().height, playingPanel.getBackground(), playingPanel.getForeground(), Color.black, 2, 0, 0);
        graphics.setFont(CFSkin.FONTNORMAL);
        graphics.setColor(this.m_clrDefaultText);
        graphics.drawString("User: " + playingPanel.getUsername(), 10, 13);
        getSkin().drawIcons(graphics, this.m_logic.getPlayer(this.m_logic.getUsername()).getIcons(), playingPanel.getChatPanel().getSize().width - 47, 4, 14, 3);
        graphics.drawString("Password: " + ((playingPanel.getTablePassword() != null) ? playingPanel.getTablePassword() : "none"), 10, 26);
        final int playerRank = this.m_logic.getPlayerRank(playingPanel.getUsername());
        final CFTableElement tableElement = playingPanel.getTableElement();
        graphics.drawString("Rank: " + ((playerRank < 0) ? "n/a  " : (playerRank + "  ")), 10, 39);
        graphics.drawString("Table: " + (tableElement.isRanked() ? "Ranked" : "Unranked") + 
        					(tableElement.isTeamTable() ? (tableElement.isBalancedTeams() ? ", Bal., " : ", ") : ", ") + 
        					CFSkin.STR_TEAMS_SHORT[tableElement.getBoardSize()] + " Board", 10, 52);
    }
    
    private void defaultPaintLoginPanel(final Graphics graphics, final LoginPanel loginPanel) {
        final int width = this.m_loginOffScreen.getWidth(null);
        final int height = this.m_loginOffScreen.getHeight(null);
        this.m_loginOffScreenG.setColor(CFSkin.g_loginColor);
        this.m_loginOffScreenG.fillRect(0, 0, width, height);
        this.m_loginOffScreenG.setColor(CFSkin.COLOR_LOGIN_LINES);
        this.m_loginOffScreenG.fillRect(width - 120, 80, 130, 500);
        this.m_loginOffScreenG.setColor(Color.black);
        if (width - this.r2Counter > 0) {
            this.r2Counter += 38;
        }
        if (this.titleCounter < loginPanel.m_tfUsername.getLocation().x - 70) {
            this.titleCounter += 12;
        }
        this.m_loginOffScreenG.drawImage((Image)GameLoader.g_mediaElements.get("img_r2title"), this.titleCounter, loginPanel.m_tfUsername.getLocation().y - 50, null);
        this.m_loginOffScreenG.setFont(CFSkin.FONTNORMAL);
        this.m_loginOffScreenG.drawString("Username:", loginPanel.m_tfUsername.getLocation().x - 80, loginPanel.m_tfUsername.getLocation().y + 15);
        this.m_loginOffScreenG.drawString("Password:", loginPanel.m_tfPassword.getLocation().x - 80, loginPanel.m_tfPassword.getLocation().y + 15);
        this.m_loginOffScreenG.setColor(Color.yellow);
        this.m_loginOffScreenG.drawString(loginPanel.getConnectionStatus(), loginPanel.m_tfUsername.getLocation().x - 70, loginPanel.m_tfPassword.getLocation().y + 40);
        this.m_loginOffScreenG.setColor(Color.black);
        this.m_loginOffScreenG.drawString("To login as a guest, leave password field blank.", loginPanel.m_tfUsername.getLocation().x - 70, loginPanel.m_tfPassword.getLocation().y + 54);
        this.doLoginPanelAnimator(loginPanel);
        graphics.drawImage(this.m_loginOffScreen, 0, 0, null);
    }
    
    public CFPlayerElement generateCFPlayerElement(final IListener listener, final String s, final String s2, final int n, final String[] array, final int n2) {
        final CFPlayerElement cfPlayerElement = new CFPlayerElement(listener, s, s2, n, array);
        cfPlayerElement.setForeground(this.m_clrForeground);
        cfPlayerElement.setBackground(this.m_clrBackground);
        cfPlayerElement.setSize(n2, 20);
        return cfPlayerElement;
    }
    
    public void paintCFPlayerElement(final Graphics graphics, final CFPlayerElement cfPlayerElement) {
        this.defaultPaintCFPlayerElement(graphics, cfPlayerElement);
    }
    
    public void defaultPaintCFChatElement(final Graphics graphics, final CFChatElement cfChatElement) {
        graphics.setColor(cfChatElement.getBackground());
        graphics.fillRect(0, 0, cfChatElement.getWidth(), cfChatElement.getHeight());
        graphics.setFont(cfChatElement.getFont());
        graphics.setColor(cfChatElement.getForeground());
        final Vector<String> lines = cfChatElement.getLines();
        for (int i = 0; i < lines.size(); ++i) {
            final String s = lines.elementAt(i);
            final int n = (i + 1) * cfChatElement.getSpacing() - 2;
            if (cfChatElement.getDrawWho() && i == 0) {
                final int index = s.indexOf(": ");
                graphics.setColor(cfChatElement.getWhoColor());
                if (index > -1) {
                	final String username = s.substring(0, index);
                    final String substring = s.substring(0, index + 2);
                    if (m_logic.inTable()) {
                    	CFPlayerElement player = m_logic.getPlayer(username);
                    	if (player != null && player.getTableID() == m_logic.getTableID()) {
                    		final CFTableElement table = m_logic.gamePanel().getLobbyPanel().getTablePanel().findTable(player.getTableID());
                    		graphics.setColor(Sprite.g_colors[table.getSlot(username)][0]);
                    	}
                    }
                    graphics.drawString(substring, 5, n);
                    graphics.setColor(cfChatElement.getForeground());
                    graphics.drawString(s.substring(index + 2), 5 + graphics.getFontMetrics(cfChatElement.getFont()).stringWidth(substring), n);
                }
                else {
                    graphics.drawString(s, 5, n);
                }
            }
            else {
                graphics.drawString(s, 5, n);
            }
        }
    }
    
    public void defaultPaintCFTableElement(final Graphics graphics, final CFTableElement cfTableElement) {
        Color color = Color.green;
        final int width = cfTableElement.getWidth();
        final int height = cfTableElement.getHeight();
        this.shadeArea(graphics, width, height, this.g_set_player, 1, 0, 0);
        graphics.setColor(Color.yellow);
        graphics.drawRect(2, 2, width - 5, height - 5);
        switch (cfTableElement.getStatus()) {
            case 3: {
                color = Color.yellow;
                break;
            }
            case 2: {
                color = Color.green;
                break;
            }
            case 4: {
                color = Color.red;
                break;
            }
        }
        String s = "Join Table " + cfTableElement.getTableID();
        if (cfTableElement.getStatus() == 3) {
            s = s + ":" + cfTableElement.getCountdown();
        }
        graphics.setFont(CFSkin.FONTNORMAL);
        graphics.setColor(color);
        if (cfTableElement.isOver()) {
            graphics.fillRoundRect(8, 5, 98, 16, 10, 10);
            graphics.setColor(this.g_set_internal[0]);
        }
        else {
            graphics.drawRoundRect(8, 5, 98, 16, 10, 10);
        }
        this.drawCenteredString(graphics, 57, 11, s, s, graphics.getColor());
        final int n = 6 + (cfTableElement.isTeamTable() ? 0 : 12);
        if (cfTableElement.isPrivate()) {
            graphics.setColor(Color.yellow);
            graphics.fillRect(n, 24, 8, 8);
            graphics.fillRect(n + 8, 26, 10, 3);
            graphics.fillRect(n + 8 + 9, 26, 2, 8);
            graphics.fillRect(n + 8 + 3, 26, 3, 7);
            graphics.setColor(Color.black);
            graphics.fillRect(n + 4 - 2, 26, 4, 4);
        }
        graphics.setColor(Color.yellow);
        graphics.setFont(CFSkin.FONTNORMAL);
        String s2 = cfTableElement.isRanked() ? "Ranked, " : "";
        s2 += CFSkin.STR_TEAMS_SHORT[cfTableElement.getBoardSize()];
        s2 += cfTableElement.isTeamTable() ? ", Tm" : "";
        s2 += cfTableElement.isBalancedTeams() ? ", Bal" : "";
        graphics.drawString(s2, n + 21, 32);
        graphics.setFont(CFSkin.FONTNORMAL);
        final int length = cfTableElement.getNames().length;
        final int n2 = length / 2;
        final int n3 = (width - 110 - n2 * 2) / n2;
        final int n4 = (height - 4) / 2;
        for (int i = 0; i < length; ++i) {
            final String s3 = cfTableElement.getNames()[i];
            final boolean equals = s3.equals("Open Slot");
            final int n5 = i % n2 * n3 + 110 + 2 - 1;
            final int n6 = i / n2 * n4 + 2;
            graphics.setColor(equals ? this.m_clrLobbyTableOpen : this.m_clrLobbyTableFilled);
            graphics.fillRect(n5 + 1, n6 + 1, n3 - 2, n4 - 2);
            this.drawCenteredString(graphics, n5 + n3 / 2, n6 + n4 / 2 - 2, cfTableElement.getNames()[i], cfTableElement.getNames()[i], equals ? this.m_clrLobbyTableOpenTxt : this.m_clrLobbyTableFilledTxt);
            if (!equals) {
                this.drawRankSquare(graphics, n5 + n3 - 16, n6 + 1, this.m_logic.getPlayerRank(s3));
            }
        }
    }
    
    private void shadeFlat(final Graphics graphics, final int n, final int n2, final int n3, final int n4, final Color color, final Color color2) {
        graphics.setColor(color);
        graphics.drawLine(n, n2, n3, n2);
        graphics.drawLine(n, n2, n, n4);
        graphics.setColor(color2);
        graphics.drawLine(n3, n2, n3, n4);
        graphics.drawLine(n3, n4, n, n4);
    }
    
    private void drawCenteredString(final Graphics graphics, final int n, final int n2, final String s, final String s2, final Color color) {
        final FontMetrics fontMetrics = graphics.getFontMetrics();
        graphics.setColor(color);
        graphics.drawString(s, n - fontMetrics.stringWidth(s2) / 2, n2 + fontMetrics.getMaxAscent() / 2);
    }
    
    public void addTableInstructions(final CFChatPanel cfChatPanel) {
        this.defaultAddInstructions(cfChatPanel, "table_instr", false);
    }
    
    public void drawIcons(final Graphics graphics, final String[] array, int n, final int n2, final int n3, final int n4) {
        for (int i = 0; i < Math.min(array.length, n4); ++i) {
            final Image icon = this.m_logic.getIcon(array[i]);
            if (icon != null) {
                graphics.drawImage(icon, n, n2, null);
                n += n3;
            }
        }
    }
    
    private void drawPulseLine(final int n, final int n2, final int n3, final int n4) {
        if (n4 == 0) {
            this.m_loginOffScreenG.drawLine(n, n2, n + n3, n2);
            return;
        }
        this.m_loginOffScreenG.drawLine(n, n2, n, n2 + n3);
    }
    
    private void doLoginPanelAnimator(final LoginPanel loginPanel) {
        final int x = loginPanel.m_tfUsername.getLocation().x;
        final int y = loginPanel.m_tfUsername.getLocation().y;
        final int width = this.m_loginOffScreen.getWidth(null);
        final int height = this.m_loginOffScreen.getHeight(null);
        this.m_loginOffScreenG.setColor(Color.white);
        this.drawPulseLine(width - 150, y - 9, -520, 0);
        this.drawPulseLine(width - 100, height - 50, -200, 0);
        this.drawPulseLine(width - 280, height - 60, 100, 0);
        this.drawPulseLine(width, 50, -130, 0);
        this.drawPulseLine(width - 150, 70, 430, 1);
        this.drawPulseLine(width - 160, height - 80, -100, 1);
        this.m_loginOffScreenG.setColor(Color.yellow);
        this.drawPulseHeader(x - 140, y - 9, 60);
        this.drawPulseHeader(width - 90, height - 50, 60);
        this.m_loginOffScreenG.setColor(loginPanel.getBackground());
        this.timer += 10;
        this.timer2 += 12;
        if (this.timer > 670) {
            this.timer = 50;
        }
        if (this.timer2 > 670) {
            this.timer2 = 0;
        }
        this.drawPulseLine(width - this.timer, y - 9, 10, 0);
        this.drawPulseLine(width - this.timer2, y - 9, 10, 0);
        this.drawPulseLine(width - 150, this.timer, 10, 1);
        this.drawPulseLine(width - 150, this.timer + 50, 10, 1);
    }
    
    public CFPrivateTableDialog generateCFPrivateTableDialog(final Frame frame, final IListener listener, final CFTableElement cfTableElement, final Point point) {
        final CFPrivateTableDialog colors = new CFPrivateTableDialog(frame, listener, cfTableElement);
        final Rectangle rect = this.m_cfProps.getRect("jointable_dialog");
        colors.setSize(rect.width, rect.height);
        colors.setLocation(point.x + rect.x, point.y + rect.y);
        this.setColors(colors);
        this.setColors(colors.m_tfPassword);
        this.setColors(colors.m_cfBtnOK);
        this.setColors(colors.m_cfBtnCancel);
        colors.m_tfPassword.setBounds(this.m_cfProps.getRect("jointable_dialog_tf_password"));
        colors.m_cfBtnOK.setBounds(this.m_cfProps.getRect("jointable_dialog_btn_ok"));
        colors.m_cfBtnCancel.setBounds(this.m_cfProps.getRect("jointable_dialog_btn_cancel"));
        return colors;
    }
    
    public void paintCFPrivateTableDialog(final Graphics graphics, final CFPrivateTableDialog cfPrivateTableDialog) {
        this.defaultPaintCFPrivateTableDialog(graphics, cfPrivateTableDialog);
    }
    
    private void addURLButton(final String s, final Panel panel) {
        String string;
        for (int n = 0; (string = this.m_cfProps.getString(s + "name" + n, null)) != null; ++n) {
            final int int1 = this.m_cfProps.getInt(s + "submin" + n, -2);
            final int int2 = this.m_cfProps.getInt(s + "submax" + n, int1);
            final CFButton generateCFButton = this.generateCFButton(string, (IListener)panel, 7);
            generateCFButton.setURLButton(this.m_cfProps.getString(s + "url" + n, "http://www.centerfleet.com/"), 500, 400, "Centerfleet", int1, int2);
            generateCFButton.setBounds(this.m_cfProps.getRect(s + n));
            if (panel instanceof LobbyPanel) {
                ((LobbyPanel)panel).addURLButton(generateCFButton);
            }
            else if (panel instanceof PlayingPanel) {
                ((PlayingPanel)panel).addURLButton(generateCFButton);
            }
        }
    }
    
    public CFButton defaultGenerateCFButton(final String s, final IListener listener, final int n) {
        final CFButton cfButton = new CFButton(s, listener, n);
        cfButton.setFont(CFSkin.FONTNORMAL);
        return cfButton;
    }
    
    public static final CFSkin getSkin() {
        return CFSkin.g_instance;
    }
    
    public static final void setSkin(final CFSkin g_instance) {
        CFSkin.g_instance = g_instance;
    }
    
    public Model generateModel(final GameBoard gameBoard, final GameNetLogic gameNetLogic, final CFProps cfProps, final Hashtable hashtable) {
        return new WormholeModel(gameBoard, gameNetLogic, cfProps, hashtable);
    }
    
    public CFSkin(final CFProps cfProps, final GameNetLogic logic) {
        this.m_cfProps = cfProps;
        this.m_logic = logic;
        this.m_clrForeground = this.m_cfProps.getColor("clr_fg");
        this.m_clrBackground = this.m_cfProps.getColor("clr_bg");
        this.m_clrWhoMe = this.m_cfProps.getColor("clr_who_me");
        this.m_clrWhoOther = this.m_cfProps.getColor("clr_who_other");
        this.g_set_external = this.getColorSet("clr_shade_ext");
        this.g_set_internal = this.getColorSet("clr_shade_int");
        this.g_set_player = this.getColorSet("clr_shade_player");
        this.m_clrDefaultText = this.m_cfProps.getColor("clr_def_txt");
        this.m_clrPanelText = this.m_cfProps.getColor("clr_panel_txt");
        this.m_clrGuestPlayerElement = this.m_cfProps.getColor("clr_player_guest");
        this.m_clrRegisteredPlayerElement = this.m_cfProps.getColor("clr_player_reg");
        this.m_clrError = this.m_cfProps.getColor("clr_error");
        this.m_clrInstructions = this.m_cfProps.getColor("clr_instructions");
        this.m_clrButtonDefault = this.m_cfProps.getColor("clr_btn_def");
        this.m_clrButtonRollover = this.m_cfProps.getColor("clr_btn_down");
        this.m_clrLobbyTableOpen = this.m_cfProps.getColor("clr_table_open");
        this.m_clrLobbyTableOpenTxt = this.m_cfProps.getColor("clr_table_open_txt");
        this.m_clrLobbyTableFilled = this.m_cfProps.getColor("clr_table_filled");
        this.m_clrLobbyTableFilledTxt = this.m_cfProps.getColor("clr_table_filled_txt");
        CFPlayerElement.setGuestString(this.m_cfProps.getString("guest_string", "guest_"));
        this.m_loginOffScreen = GamePanel.m_applet.createImage(this.m_logic.getSize().width, this.m_logic.getSize().height);
        this.m_loginOffScreenG = this.m_loginOffScreen.getGraphics();
        this.timer = 50;
        this.titleCounter = -100;
    }
    
    private void drawRankSquare(final Graphics graphics, final int n, final int n2, final int n3) {
        if (n3 < 0) {
            return;
        }
        graphics.setColor(getRankColor(n3));
        graphics.fillRect(n, n2, 13, 13);
        graphics.setColor(Color.black);
        graphics.drawRect(n, n2, 13, 13);
        graphics.drawRect(n, n2, 12, 12);
    }
    
    public boolean isJoinTableClick(final CFTableElement cfTableElement, final int n, final int n2) {
        return n < 110;
    }
    
    static {
        FONTSMALL = new Font("Helvetica", 0, 12);
        FONTNORMAL = new Font("Helvetica", 1, 14);
        FONTELEMENT = new Font("Helvetica", 1, 12);
        FONTELEMENT_TITLE = new Font("Helvetica", 1, 12);
        STR_TEAMS = new String[] { "Auto Size", "Small Board", "Medium Board", "Large Board" };
        STR_TEAMS_SHORT = new String[] { "Auto", "Sml", "Med", "Lrg" };
        TEAM_COLORS = new Color[] { Color.white, new Color(232, 224, 0), new Color(87, 83, 255) };
        TEAM_BG_COLORS = new Color[] { Color.black, Color.black, Color.white };
        TEAM_NAMES = new String[] { "", "Gold Team", "Blue Team" };
        COLOR_LOGIN_LINES = new Color(150, 150, 150);
        m_rectCFPD_Icons = new Rectangle(9, 28, 200, 15);
        m_rectCFPD_Clan = new Rectangle(9, CFSkin.m_rectCFPD_Icons.y + 16, 60, 15);
        g_loginColor = Color.gray;
    }
    
    public Choice generateChoice() {
        final Choice colors = new Choice();
        colors.setFont(CFSkin.FONTNORMAL);
        this.setColors(colors);
        for (int i = 0; i < CFSkin.STR_TEAMS.length; ++i) {
            colors.addItem(CFSkin.STR_TEAMS[i]);
        }
        return colors;
    }
    
    public String isTablePlayerClick(final CFTableElement cfTableElement, int n, int n2) {
        n -= cfTableElement.getX();
        n2 -= cfTableElement.getY();
        final int width = cfTableElement.getWidth();
        final int height = cfTableElement.getHeight();
        final int n3 = cfTableElement.getNames().length / 2;
        final int n4 = 111;
        final int n5 = (n - n4) / ((width - n4) / n3);
        if (n < n4 || n5 < 0 || n5 >= n3) {
            return null;
        }
        final int n6 = n5 + n2 / (height / 2) * n3;
        if (n6 > -1 && n6 < cfTableElement.getNames().length && !cfTableElement.getNames()[n6].equals("Empty")) {
            return cfTableElement.getNames()[n6];
        }
        return null;
    }
}

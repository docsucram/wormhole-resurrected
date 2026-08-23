package client;
import java.util.*;
import java.awt.event.*;
import java.io.*;
import java.awt.*;

public abstract class Model extends MouseAdapter implements KeyListener
{
    protected boolean m_bRefreshParent;
    protected GameBoard m_board;
    protected CFProps m_props;
    protected Hashtable m_mediaTable;
    protected GameNetLogic m_logic;
    protected CFTableElement m_tableElement;
    protected byte m_slot;
    public static long g_startTime;
    
    public void reset() {
        this.m_logic.resetCredits();
    }
    
    public abstract void setTeam(final String p0, final byte p1);
    
    public Model(final GameBoard board, final GameNetLogic logic, final CFProps props, final Hashtable mediaTable) {
        this.m_board = board;
        this.m_props = props;
        this.m_logic = logic;
        this.m_mediaTable = mediaTable;
        board.addKeyListener(this);
        board.addMouseListener(this);
    }
    
    public void keyTyped(final KeyEvent keyEvent) {
    }
    
    public abstract void keyPressed(final KeyEvent p0);
    
    public abstract void handleGamePacket(final DataInput p0) throws IOException;
    
    public abstract void readJoin(final DataInput p0) throws IOException;
    
    public abstract void updatePlayerRank(final String p0, final int p1, final int p2);
    
    public int getSleepTime() {
        return 50;
    }
    
    public abstract void doOneCycle();
    
    public abstract void removePlayer(final String p0);
    
    public void setSlot(final int n) {
        this.m_slot = (byte)n;
    }
    
    public boolean needToUpdateParent() {
        return this.m_bRefreshParent;
    }
    
    public abstract void keyReleased(final KeyEvent p0);
    
    public abstract void paintParent(final Graphics p0);
    
    public abstract void addPlayer(final String p0, final int p1, final byte p2, final String[] p3, final int p4);
    
    public long getTimeElapsed() {
        return System.currentTimeMillis() - Model.g_startTime;
    }
    
    public void setTable(final CFTableElement tableElement) {
        this.m_tableElement = tableElement;
    }
}

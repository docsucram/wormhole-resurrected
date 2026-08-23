package client;
import java.util.*;
import java.awt.*;

public class CFTablePanel extends CFScroller
{
    private Hashtable<Integer, CFTableElement> m_tableMap;
    
    public synchronized CFTableElement findTable(final int n) {
        return (CFTableElement)this.m_tableMap.get(new Integer(n));
    }
    
    public synchronized void setTableStatus(final int n, final byte b, final int n2) {
        final CFTableElement table = this.findTable(n);
        if (table != null) {
            table.setStatus(b, n2);
        }
    }
    
    public CFTablePanel(final IListener listener) {
        super(listener);
        this.m_tableMap = new Hashtable<Integer, CFTableElement>();
    }
    
    public synchronized void removeTable(final int n) {
        final CFTableElement cfTableElement = (CFTableElement)this.m_tableMap.remove(new Integer(n));
        if (cfTableElement != null) {
            this.removeElement(cfTableElement);
        }
    }
    
    protected void postpaint(final Graphics graphics) {
        CFSkin.getSkin().paintCFTablePanel(graphics, this);
    }
    
    public synchronized void addTable(final int n, final int n2) {
        final CFTableElement generateCFTableElement = CFSkin.getSkin().generateCFTableElement(super.m_listener, n, this.getSize().width - 30, n2);
        generateCFTableElement.setParent(this);
        this.m_tableMap.put(new Integer(n), generateCFTableElement);
        this.addSortedElement(generateCFTableElement);
    }
    
    public synchronized void addPlayerToTable(final int n, final String s, final byte b) {
        final CFTableElement table = this.findTable(n);
        if (table != null) {
            table.addPlayer(s, b);
        }
    }
    
    public synchronized void clearTables() {
        this.removeAllElements();
        this.m_tableMap.clear();
    }
    
    protected void prepaint(final Graphics graphics) {
        CFSkin.getSkin().prePaintCFTablePanel(graphics, this);
    }
    
    public synchronized void removePlayerFromTable(final int n, final String s) {
        final CFTableElement table = this.findTable(n);
        if (table != null) {
            table.removePlayer(s);
        }
    }
}

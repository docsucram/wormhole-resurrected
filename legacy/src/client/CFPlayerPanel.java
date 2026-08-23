package client;
import java.awt.*;

public class CFPlayerPanel extends CFScroller implements IListener
{
    public synchronized CFPlayerElement getPlayer(final String s) {
        return this.findPlayer(s);
    }
    
    private CFPlayerElement findPlayer(final String s) {
        for (int i = 0; i < super.m_vComponents.size(); ++i) {
            final CFPlayerElement cfPlayerElement = (CFPlayerElement)super.m_vComponents.elementAt(i);
            if (cfPlayerElement != null && cfPlayerElement.getName().equals(s)) {
                return cfPlayerElement;
            }
        }
        return null;
    }
    
    public void fireEvent(final Object o, final Object o2) {
        if (super.m_listener != null) {
            super.m_listener.fireEvent(this, o);
        }
    }
    
    public CFPlayerPanel(final IListener listener) {
        super(listener);
    }
    
    public synchronized void removePlayer(final String s) {
        final CFPlayerElement player = this.findPlayer(s);
        if (player != null) {
            this.removeElement(player);
        }
    }
    
    public void postpaint(final Graphics graphics) {
        CFSkin.getSkin().paintCFPlayerPanel(graphics, this);
    }
    
    public synchronized void addPlayer(final String username, final String s2, final int rank, final String[] array) {
        if (this.findPlayer(username) !=null) {
            return;
        }
        final CFPlayerElement generateCFPlayerElement = CFSkin.getSkin().generateCFPlayerElement(this, username, s2, rank, array, super.m_scrollingAreaWidth);
        generateCFPlayerElement.setParent(this);
        this.addSortedElement(generateCFPlayerElement);
    }
    
    public synchronized void clearPlayers() {
        this.removeAllElements();
    }
    
    public void prepaint(final Graphics graphics) {
        CFSkin.getSkin().prePaintCFPlayerPanel(graphics, this);
    }
    
    public synchronized void setPlayerRank(final String s, final int rank) {
        final CFPlayerElement player = this.findPlayer(s);
        if (player != null) {
            player.setRank(rank);
        }
    }
}

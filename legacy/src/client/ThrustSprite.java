package client;
import java.awt.*;

public class ThrustSprite extends Sprite
{
    static final Color[] g_colors;
    final int MAX_CYCLE = 30;
    int m_radius;
    
    public ThrustSprite(final int n, final int n2) {
        super(n, n2);
        this.m_radius = 10;
        this.init("thrust", n, n2, false);
        super.spriteType = 0;
        super.shapeRect = new Rectangle(super.intx, super.inty);
        super.m_color = ThrustSprite.g_colors[WHUtil.randABSInt() % ThrustSprite.g_colors.length];
    }
    
    public void drawSelf(final Graphics graphics) {
        graphics.setColor(super.m_color);
        WHUtil.drawCenteredCircle(graphics, super.x, super.y, this.m_radius);
    }
    
    static {
        g_colors = new Color[] { Color.orange, Color.yellow, Color.red };
    }
    
    public void behave() {
        super.behave();
        if (super.spriteCycle++ > 30) {
            super.shouldRemoveSelf = true;
        }
        this.m_radius = Math.max(2, 10 - super.spriteCycle / 2);
    }
}

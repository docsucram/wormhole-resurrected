package client;
import java.awt.*;

public class StringSprite extends Sprite
{
    Color m_color;
    final int MAX_CYCLE = 100;
    
    public StringSprite(final int n, final int n2, final String s) {
        super(n, n2);
        this.m_color = Color.white;
        this.init(s, n, n2, true);
        super.spriteType = 0;
        (super.shapeRect = new Rectangle(20, 100)).move(n, n2);
    }
    
    public void drawSelf(final Graphics graphics) {
        graphics.setColor(this.m_color);
        graphics.setFont(WormholeModel.fontTwelve);
        graphics.drawString(super.name, super.intx, super.inty);
    }
    
    public void behave() {
        if (super.spriteCycle++ > 100) {
            super.shouldRemoveSelf = true;
        }
    }
}

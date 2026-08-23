package client;
import java.applet.*;
import java.awt.*;
import javax.sound.sampled.*;

public class ExplosionSprite extends Sprite
{
    int m_colorType;
    final int MAX_CYCLE = 40;
    int RINGS;
    
    void setPowerupExplosion() {
        super.spriteType = 2;
        this.setHealth(100, 500);
        int n = (super.spriteCycle - this.RINGS) * 2;
        if (n < 0) {
            n = 0;
        }
        super.shapeRect.reshape(super.intx - n, super.inty - n, n * 2, n * 2);
    }
    
    ExplosionSprite(final int n, final int n2) {
        super(n, n2);
        this.RINGS = 6;
        this.init("explosion", n, n2, true);
        super.spriteType = 0;
        super.shapeRect = new Rectangle(n - 50, n2 - 50, 100, 100);
        GameBoard.playSound("snd_explosion");
    }
    
    ExplosionSprite(final int n, final int n2, final int colorType) {
        this(n, n2);
        this.m_colorType = colorType;
    }
    
    public void drawSelf(final Graphics graphics) {
        for (int i = 0; i < this.RINGS; ++i) {
            final int max = Math.max(Math.min(19, i + super.spriteCycle - 10), 0);
            graphics.setColor(Sprite.g_colors[this.m_colorType][max]);
            int n = (super.spriteCycle - i) * 2;
            if (n < 0) {
                n = 0;
            }
            if (max != 19) {
                WHUtil.drawCenteredCircle(graphics, super.x, super.y, n);
            }
        }
    }
    
    public void behave() {
        if (super.spriteType != 0) {
            int n = (super.spriteCycle - this.RINGS) * 2;
            if (n < 0) {
                n = 0;
            }
            super.shapeRect.reshape(super.intx - n, super.inty - n, n * 2, n * 2);
            super.behave();
        }
        if (super.spriteCycle++ > 40) {
            super.shouldRemoveSelf = true;
        }
    }
}

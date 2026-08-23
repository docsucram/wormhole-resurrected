package client;
import java.awt.*;

public class MineSprite extends Sprite
{
    static final int MINESIZE = 15;
    static final int INNER_MINESIZE = 11;
    static final int INNER_BOX = 5;
    static final int INNER_BOX_SIZE = 10;
    boolean m_bShrapnel;
    int m_currentShade;
    
    public MineSprite(final int n, final int n2) {
        super(n, n2);
        this.init("mns", n, n2, true);
        super.spriteType = 1;
        super.shapeRect = new Rectangle(super.intx - 15, super.inty - 15, 30, 30);
        super.indestructible = true;
        this.setHealth(10, 0);
        super.m_powerupType = 8;
    }
    
    public void drawSelf(final Graphics graphics) {
        graphics.setColor(Sprite.g_colors[super.m_slot][super.spriteCycle % 20]);
        graphics.translate(super.intx, super.inty);
        graphics.drawLine(-11, -11, 11, 11);
        graphics.drawLine(-11, 11, 11, -11);
        graphics.fillRect(-5, -5, 10, 10);
        graphics.setColor(Sprite.g_colors[super.m_slot][0]);
        graphics.drawLine(-15, 0, 15, 0);
        graphics.drawLine(0, -15, 0, 15);
        graphics.translate(-super.intx, -super.inty);
    }
    
    public void setCollided(final Sprite collided) {
        super.setCollided(collided);
        if (super.shouldRemoveSelf) {
            this.killSelf(5, 30);
        }
    }
    
    public void behave() {
        super.behave();
        if (super.spriteCycle == 40) {
            super.indestructible = false;
            this.setHealth(5, 20);
            super.vectorx = 0.0;
            super.vectory = 0.0;
        }
    }
}

package client;
import java.awt.*;

public class UFOSprite extends Sprite
{
    static final int ufoW = 60;
    static final int ufoH = 26;
    static final int ufoW2 = 30;
    static final int ufoH2 = 13;
    int m_currentColor;
    
    public UFOSprite(final int n, final int n2) {
        super(n, n2);
        this.init("ufo", n, n2, true);
        super.spriteType = 1;
        super.shapeRect = new Rectangle(super.intx - 30, super.inty - 13, 60, 26);
        this.setHealth(40, 20);
        super.dRotate = 30.0;
        super.m_thrust = 0.2;
        super.maxThrust = 5.0;
        super.m_powerupType = 9;
    }
    
    public void drawSelf(final Graphics graphics) {
        graphics.setColor(super.m_color);
        graphics.drawOval(super.intx - 30, super.inty - 13, 60, 26);
        graphics.setColor(Sprite.g_colors[super.m_slot][this.m_currentColor++ % 20]);
        graphics.fillOval(super.intx - 18, super.inty - 10, 36, 12);
        graphics.setColor(super.m_color);
        graphics.drawOval(super.intx - 18, super.inty - 10, 36, 12);
    }
    
    public void setCollided(final Sprite collided) {
        super.setCollided(collided);
        if (super.shouldRemoveSelf) {
            this.killSelf(20, 10);
            PowerupSprite.genPowerup(super.intx, super.inty).addSelf();
            PowerupSprite.genPowerup(super.intx, super.inty).addSelf();
        }
    }
    
    public void behave() {
        super.behave();
        this.track();
        if (super.spriteCycle % 150 == 0) {
            int n = 0;
            do {
                final HeatSeekerMissile heatSeekerMissile = new HeatSeekerMissile(super.intx, super.inty);
                heatSeekerMissile.addSelf();
                heatSeekerMissile.setDegreeAngle(n * 120);
                heatSeekerMissile.doMaxThrust(heatSeekerMissile.maxThrust);
            } while (++n < 3);
        }
    }
}

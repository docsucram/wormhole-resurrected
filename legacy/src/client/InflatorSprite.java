package client;
import java.awt.*;

public class InflatorSprite extends Sprite
{
    int m_inflationSize;
    final double m_maxAttackDistance = 100.0;
    int m_perceivedSize;
    
    public InflatorSprite(final int n, final int n2) {
        super(n, n2);
        this.init("inf", n, n2, true);
        super.spriteType = 1;
        super.m_poly = WHUtil.symPolygon(8, 30, 0);
        super.shapeType = 1;
        this.setHealth(30, 15);
        this.m_perceivedSize = 20;
        super.m_powerupType = 10;
    }
    
    public void setCollided(final Sprite collided) {
        super.setCollided(collided);
        if (super.m_health < 8 || super.shouldRemoveSelf) {
            this.killSelf();
            PowerupSprite.genPowerup(super.intx, super.inty).addSelf();
        }
    }
    
    public void behave() {
        super.behave();
        if (this.m_perceivedSize != super.m_health) {
            if (this.m_perceivedSize > super.m_health) {
                if (this.m_perceivedSize > super.m_health + 20) {
                    this.m_perceivedSize -= 5;
                }
                else {
                    --this.m_perceivedSize;
                }
            }
            else if (this.m_perceivedSize + 20 < super.m_health) {
                this.m_perceivedSize += 5;
            }
            else {
                ++this.m_perceivedSize;
            }
            super.m_poly = WHUtil.symPolygon(8, 10 + this.m_perceivedSize, 15);
        }
        if (super.spriteCycle % 2 == 0) {
            ++this.m_perceivedSize;
            ++super.m_health;
            super.m_poly = WHUtil.symPolygon(8, 10 + this.m_perceivedSize, 15);
        }
    }
    
    public Rectangle getShapeRect() {
        final Rectangle bounds = super.m_poly.getBounds();
        bounds.move(super.intx - bounds.width / 2, super.inty - bounds.height / 2);
        return bounds;
    }
}

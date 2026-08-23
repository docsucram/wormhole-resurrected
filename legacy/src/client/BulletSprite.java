package client;
import java.awt.*;
import java.awt.image.*;

public class BulletSprite extends Sprite
{
    public static int g_nBullets;
    static final int BULLETSIZE = 10;
    static final int INNER_BULLETSIZE = 8;
    static final int INNER_BOX = 3;
    static final int INNER_BOX_SIZE = 6;
    static final int m_lifespan = 100;
    static final int maxVelocity = 10;
    public boolean m_bPowerup;
    public boolean m_bCountTowardsQuota;
    public byte m_upgradeLevel;
    public Color m_internalColor;
    public int m_powerupShipType;
    public boolean m_bConcussive;
    int offx;
    int offy;
    private static final double CONCUSSIVE_RECOIL = 5.0;
    
    public void addSelf() {
        super.addSelf();
        if (this.m_bCountTowardsQuota) {
            ++BulletSprite.g_nBullets;
        }
    }
    
    public BulletSprite(final int n, final int n2, final int n3, final int n4, final Color internalColor, final int spriteType) {
        super(n, n2);
        this.init("blt", n, n2, true);
        super.shapeRect = new Rectangle(n - 5, n2 - 5, n4, n4);
        super.spriteType = spriteType;
        if (super.spriteType == 2) {
            super.m_color = Sprite.model.m_color;
        }
        this.m_internalColor = internalColor;
        this.setHealth(1, n3);
        super.m_bIsBullet = true;
        this.m_bCountTowardsQuota = (super.spriteType == 2);
    }
    
    public void drawSelf(final Graphics graphics) {
        graphics.setColor(this.m_internalColor);
        graphics.translate(super.intx, super.inty);
        if (this.m_bConcussive) {
            WHUtil.drawCenteredCircle(graphics, 0.0, 0.0, 10);
            graphics.setColor(Sprite.g_colors[super.m_slot][super.spriteCycle % 20]);
            WHUtil.fillCenteredCircle(graphics, 0.0, 0.0, 7);
            graphics.drawLine(0, 0, this.offx, this.offy);
        }
        else {
            graphics.drawLine(-8, -8, 8, 8);
            graphics.drawLine(-8, 8, 8, -8);
            graphics.fillRect(-3, -3, 6, 6);
            graphics.setColor(super.m_color);
            graphics.drawLine(-super.shapeRect.width, 0, super.shapeRect.width, 0);
            graphics.drawLine(0, -super.shapeRect.width, 0, super.shapeRect.width);
            if (this.m_bPowerup) {
                WHUtil.drawCenteredCircle(graphics, 0.0, 0.0, 20);
                graphics.drawImage(WormholeModel.getImages("img_smallpowerups")[PowerupSprite.convertToSmallImage(super.m_powerupType)], -8, -5, null);
            }
            graphics.drawLine(0, 0, this.offx, this.offy);
        }
        graphics.translate(-super.intx, -super.inty);
    }
    
    public void setCollided(final Sprite collided) {
        super.setCollided(collided);
        if (this.m_bConcussive) {
            final double angle = WHUtil.findAngle(collided.x, collided.y, super.x, super.y);
            collided.vectorx += 5.0 * Math.cos(angle * 0.017453292519943295);
            collided.vectory += 5.0 * Math.sin(angle * 0.017453292519943295);
        }
        if (super.shouldRemoveSelf) {
            if (this.m_bPowerup) {
                final ExplosionSprite explosionSprite = new ExplosionSprite(super.intx, super.inty, Sprite.model.m_slot);
                explosionSprite.setPowerupExplosion();
                explosionSprite.addSelf();
            }
            else {
                final ExplosionSprite explosionSprite2 = new ExplosionSprite(super.intx, super.inty, 9);
                explosionSprite2.RINGS = 2;
                explosionSprite2.addSelf();
            }
            final ParticleSprite particleSprite = new ParticleSprite(super.intx, super.inty);
            particleSprite.particleInit(8, 5);
            particleSprite.addSelf();
        }
    }
    
    public void setSentByEnemy(final byte slot, final int powerupShipType) {
        super.m_slot = slot;
        this.m_powerupShipType = powerupShipType;
    }
    
    public void removeSelf() {
        super.removeSelf();
        if (this.m_bCountTowardsQuota) {
            --BulletSprite.g_nBullets;
        }
    }
    
    void setVelocity(final double vectorx, final double vectory) {
        super.vectorx = vectorx;
        super.vectory = vectory;
        this.offx = -(int)(super.vectorx * 8.0);
        this.offy = -(int)(super.vectory * 8.0);
    }
    
    void setPowerup(final int powerupType) {
        super.m_powerupType = powerupType;
        this.m_bPowerup = true;
    }
    
    static void clearClass() {
        BulletSprite.g_nBullets = 0;
    }
    
    public void setConcussive() {
        this.m_bConcussive = true;
    }
    
    public void behave() {
        super.behave();
        if (super.spriteCycle > 100) {
            super.shouldRemoveSelf = true;
        }
    }
}

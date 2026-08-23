package client;
import java.awt.*;

public class GunshipSprite extends Sprite
{
    static final int[][] g_points;
    static final int[][] g_turretPoints;
    RotationalPolygon m_rPoly;
    RotationalPolygon m_rTurretPoly;
    boolean m_bRightSeeker;
    static final int START_STRAFE = 0;
    static final int STRAFE = 1;
    static final int RETREAT = 2;
    static final int KAMIKAZE = 3;
    int m_mode;
    int m_strafeOffsetX;
    int m_strafeOffsetY;
    int m_retreatCounter;
    
    public void behave() {
        super.behave();
        final int n = (int)WHUtil.distanceFrom(this, Sprite.model.m_player);
        if (super.spriteCycle % 40 == 0 && super.m_bInDrawingRect) {
            for (int i = 0; i < GunshipSprite.g_turretPoints.length; ++i) {
                final BulletSprite bulletSprite = new BulletSprite(this.m_rTurretPoly.poly.xpoints[i] + super.intx, this.m_rTurretPoly.poly.ypoints[i] + super.inty, 2, 10, super.m_color, 1);
                bulletSprite.setSentByEnemy(super.m_slot, 12);
                final Point calcLead = this.calcLead();
                bulletSprite.setVelocity(6.0 * WHUtil.scaleVector(calcLead.x, calcLead.y), 6.0 * WHUtil.scaleVector(calcLead.y, calcLead.x));
                bulletSprite.addSelf();
            }
        }
        switch (this.m_mode) {
            case 0: {
                final double n2 = (WHUtil.findAngle(Sprite.model.m_player.x, Sprite.model.m_player.y, super.intx, super.inty) + (this.m_bRightSeeker ? 90 : -90)) * 0.017453292519943295;
                this.m_strafeOffsetX = (int)(200.0 * Math.cos(n2));
                this.m_strafeOffsetY = (int)(200.0 * Math.sin(n2));
                this.m_mode = 1;
                break;
            }
            case 1: {
                final int n3 = Sprite.model.m_player.intx + this.m_strafeOffsetX;
                final int n4 = Sprite.model.m_player.inty + this.m_strafeOffsetY;
                final int distance = WHUtil.distance(n3, n4, super.intx, super.inty);
                if (n < 120) {
                    this.m_mode = 2;
                }
                else if (distance > 50) {
                    this.realTrack(n3, n4, false);
                }
                else {
                    this.m_mode = 2;
                }
                this.m_retreatCounter = 0;
                break;
            }
            case 2: {
                this.reverseTrack();
                if (this.m_retreatCounter++ > 200) {
                    this.m_mode = 3;
                    return;
                }
                if (super.m_health < 10) {
                    this.m_mode = 3;
                    return;
                }
                if (n > 400) {
                    this.m_mode = 0;
                    return;
                }
                break;
            }
            case 3: {
                this.track();
            }
        }
    }
    
    public GunshipSprite(final int n, final int n2) {
        super(n, n2);
        this.m_rPoly = new RotationalPolygon(GunshipSprite.g_points);
        this.m_rTurretPoly = new RotationalPolygon(GunshipSprite.g_turretPoints);
        this.init("gs", n, n2, true);
        super.spriteType = 1;
        this.setHealth(50, 10);
        super.shapeType = 1;
        super.m_poly = this.m_rPoly.poly;
        this.m_bRightSeeker = (WHUtil.randABSInt() % 2 == 0);
        super.dRotate = 2.0;
        super.m_thrust = 0.25;
        super.maxThrust = 4.0;
        super.m_powerupType = 12;
    }
    
    public void drawSelf(final Graphics graphics) {
        super.drawSelf(graphics);
        graphics.translate(super.intx, super.inty);
        for (int i = 0; i < this.m_rTurretPoly.poly.npoints; ++i) {
            final int n = this.m_rTurretPoly.poly.xpoints[i];
            final int n2 = this.m_rTurretPoly.poly.ypoints[i];
            graphics.setColor(super.m_color);
            WHUtil.fillCenteredCircle(graphics, n, n2, 8);
            final int n3 = (int)WHUtil.findAngle(Sprite.model.m_player.x, Sprite.model.m_player.y, n + super.intx, n2 + super.inty);
            graphics.setColor(Color.black);
            WHUtil.fillCenteredArc(graphics, n, n2, 8, -n3 - 20, 40);
        }
        graphics.translate(-super.intx, -super.inty);
    }
    
    public void setCollided(final Sprite collided) {
        super.setCollided(collided);
        if (super.shouldRemoveSelf) {
            this.killSelf(20, 10);
            PowerupSprite.genPowerup(super.intx, super.inty).addSelf();
            PowerupSprite.genPowerup(super.intx, super.inty).addSelf();
            PowerupSprite.genPowerup(super.intx, super.inty).addSelf();
        }
    }
    
    static {
        g_points = new int[][] { { 40, 0, 1 }, { 35, -6, 1 }, { 25, -11, 1 }, { 2, -15, 1 }, { -25, -15, 1 }, { -35, 0, 1 }, { -25, 15, 1 }, { 2, 15, 1 }, { 25, 11, 1 }, { 35, 6, 1 } };
        g_turretPoints = new int[][] { { 22, 0 }, { -16, 0 } };
    }
    
    void setDegreeAngle(final double degreeAngle) {
        super.setDegreeAngle(degreeAngle);
        this.m_rPoly.setAngle(super.radAngle);
        this.m_rTurretPoly.setAngle(super.radAngle);
        this.m_rPoly.recalcPolygon();
        super.m_poly = this.m_rPoly.poly;
    }
    
    public Rectangle getShapeRect() {
        final Rectangle bounds = super.m_poly.getBounds();
        bounds.move(super.intx - bounds.width / 2, super.inty - bounds.height / 2);
        return bounds;
    }
}

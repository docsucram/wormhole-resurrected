package client;
import java.awt.*;

public class PortalTurretSprite extends Sprite
{
    private static final int[][] g_points;
    private static final int[][] g_turretPoints;
    private RotationalPolygon m_rPoly;
    private RotationalPolygon m_rTurretPoly;
    private int m_shotDelay;
    private PortalSprite m_portal;
    private static final int TURRET_ORBIT_DISTANCE = 115;
    private static final int TURRET_ATTACK_DISTANCE = 260;
    private static final int TURRET_ATTACK_DELAY = 16;
    private static final int TURRET_D_ANGLE = 1;
    private double m_orbitAngle;
    
    public void behave() {
        super.behave();
        if (this.m_portal.shouldRemoveSelf) {
            this.killSelf(super.intx, super.inty);
            return;
        }
        this.handleOrbit();
        this.handleShot();
    }
    
    void calcOrbit() {
        this.m_orbitAngle = super.radAngle + 1.5707963267948966;
        this.setLocation((int)(this.m_portal.intx + 115.0 * Math.cos(this.m_orbitAngle)), (int)(this.m_portal.inty + 115.0 * Math.sin(this.m_orbitAngle)));
    }
    
    private void handleOrbit() {
        this.setDegreeAngle(super.angle + 1.0);
        this.calcOrbit();
    }
    
    public PortalTurretSprite(final PortalSprite portal) {
        super(0, 0);
        this.m_rPoly = new RotationalPolygon(PortalTurretSprite.g_points);
        this.m_rTurretPoly = new RotationalPolygon(PortalTurretSprite.g_turretPoints);
        this.m_portal = portal;
        this.calcOrbit();
        this.init("trt", super.intx, super.inty, true);
        super.spriteType = 1;
        this.setHealth(50, 7);
        super.shapeType = 1;
        super.m_poly = this.m_rPoly.poly;
        super.m_powerupType = 7;
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
        int n4 = 0;
        do {
            WHUtil.fillCenteredCircle(graphics, (int)(this.m_portal.intx + 115.0 * Math.cos(this.m_orbitAngle + n4 * 0.1)), (int)(this.m_portal.inty + 115.0 * Math.sin(this.m_orbitAngle + n4 * 0.1)), 3);
        } while (++n4 < 3);
    }
    
    private void handleShot() {
        if (this.m_shotDelay > 0) {
            --this.m_shotDelay;
        }
        if (super.m_bInDrawingRect && this.m_shotDelay <= 0 && (int)WHUtil.distanceFrom(this, Sprite.model.m_player) < 260) {
            if (Sprite.model.m_player == null) {
                return;
            }
            final Point calcLead = this.calcLead();
            this.m_shotDelay = 16;
            for (int i = 0; i < PortalTurretSprite.g_turretPoints.length; ++i) {
                final BulletSprite bulletSprite = new BulletSprite(this.m_rTurretPoly.poly.xpoints[i] + super.intx, this.m_rTurretPoly.poly.ypoints[i] + super.inty, 1, 10, super.m_color, 1);
                bulletSprite.setSentByEnemy(super.m_slot, 7);
                bulletSprite.setVelocity(8.0 * WHUtil.scaleVector(calcLead.x, calcLead.y), 8.0 * WHUtil.scaleVector(calcLead.y, calcLead.x));
                bulletSprite.addSelf();
            }
        }
    }
    
    public void setCollided(final Sprite collided) {
        super.setCollided(collided);
        if (super.shouldRemoveSelf) {
            this.killSelf(20, 10);
            PowerupSprite.genPowerup(super.intx, super.inty).addSelf();
            PowerupSprite.genPowerup(super.intx, super.inty).addSelf();
        }
    }
    
    static {
        g_points = new int[][] { { -28, 0, 1 }, { -7, -25, 0 }, { 30, -40, 1 }, { 15, -10, 0 }, { 15, 10, 0 }, { 30, 40, 1 }, { -7, 25, 0 } };
        g_turretPoints = new int[][] { { 0, -11 }, { 0, 11 } };
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

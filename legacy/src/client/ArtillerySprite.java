package client;
import java.awt.*;

public class ArtillerySprite extends Sprite
{
    private PlayerSprite m_player;
    private static final short[][] g_points;
    private static final int FIRING_DELAY = 60;
    private static final int FIRING_RATE = 5;
    private static final int TELEPORT_THRESHHOLD = 50;
    private static final int TELEPORT_TIME = 45;
    private int m_mode;
    private static final int MODE_WARPING_IN = 0;
    private static final int MODE_TRACKING = 1;
    private static final int MODE_FIRING = 2;
    private static final int MODE_TELEPORTING = 3;
    private RotationalPolygon m_rPoly;
    private static final int BASE_WIDTH = 8;
    private static final int BASE_HEIGHT = 20;
    private int m_shotsFiredThisRound;
    private int m_framesDrawn;
    private int m_teleportationCounter;
    
    public ArtillerySprite(final int n, final int n2) {
        super(n, n2);
        this.m_rPoly = RotationalPolygon.constructPolygon(ArtillerySprite.g_points, true);
        this.init("art", super.intx, super.inty, false);
        this.m_player = Sprite.model.m_player;
        this.setHealth(10, 5);
        super.shapeRect = new Rectangle(super.intx - 20, super.inty - 20, 40, 40);
        super.spriteType = 1;
        super.m_powerupType = 19;
        this.m_mode = 3;
        this.m_teleportationCounter = 45;
    }
    
    public void drawSelf(final Graphics graphics) {
        super.drawSelf(graphics);
        ++this.m_framesDrawn;
        graphics.translate(super.intx, super.inty);
        graphics.setColor(Sprite.g_colors[super.m_slot][3]);
        double n = 1.0;
        if (this.m_mode == 3) {
            if (this.m_teleportationCounter < 2) {
                n = 0.0;
            }
            else {
                n = this.m_teleportationCounter / 45.0;
            }
        }
        else if (this.m_mode == 0) {
            n = this.m_teleportationCounter / 45.0;
        }
        final int n2 = (int)(8.0 * n);
        final int n3 = (int)(20.0 * n);
        graphics.drawRect(-n2 / 2, -(5 + n3), n2, n3);
        graphics.drawRect(-(5 + n3), -n2 / 2, n3, n2);
        graphics.drawRect(-n2 / 2, 5, n2, n3);
        graphics.drawRect(5, -n2 / 2, n3, n2);
        graphics.setColor(Sprite.g_colors[super.m_slot][(int)((1.0 - n) * 19.0)]);
        WHUtil.drawPoly(graphics, this.m_rPoly.poly);
        graphics.translate(-super.intx, -super.inty);
    }
    
    public void setCollided(final Sprite collided) {
        super.setCollided(collided);
        if (super.shouldRemoveSelf) {
            this.killSelf();
            PowerupSprite.genPowerup(super.intx, super.inty).addSelf();
        }
    }
    
    static {
        g_points = new short[][] { { -5, -23 }, { -5, -20 }, { 0, -20 }, { -9, -20 }, { -9, 20 } };
    }
    
    void setDegreeAngle(final double degreeAngle) {
        if (degreeAngle == super.angle) {
            return;
        }
        super.setDegreeAngle(degreeAngle);
        this.m_rPoly.setAngle(super.radAngle + 1.5707963267948966);
        this.m_rPoly.recalcPolygon();
    }
    
    public void behave() {
        super.behave();
        final double n = 0.0;
        super.vectorx = n;
        super.vectory = n;
        this.setDegreeAngle(WHUtil.findAngle(this.m_player.intx, this.m_player.inty, super.intx, super.inty));
        if (this.m_mode != 3 && this.m_framesDrawn > 50) {
            this.m_mode = 3;
            this.m_teleportationCounter = 45;
        }
        switch (this.m_mode) {
            case 0: {
                if (this.m_teleportationCounter-- <= 0) {
                    this.m_mode = 1;
                    super.m_damage = 5;
                    return;
                }
                break;
            }
            case 1: {
                if (super.spriteCycle % 60 == 0) {
                    this.m_mode = 2;
                    this.m_shotsFiredThisRound = 0;
                    return;
                }
                break;
            }
            case 2: {
                if (this.m_shotsFiredThisRound > 2) {
                    this.m_mode = 1;
                    return;
                }
                if (super.spriteCycle % 5 == 0) {
                    ++this.m_shotsFiredThisRound;
                    final BulletSprite bulletSprite = new BulletSprite(super.intx, super.inty, 2, 10, super.m_color, 1);
                    bulletSprite.setSentByEnemy(super.m_slot, 19);
                    bulletSprite.setConcussive();
                    final Point calcLead = this.calcLead();
                    bulletSprite.setVelocity(8.0 * WHUtil.scaleVector(calcLead.x, calcLead.y), 8.0 * WHUtil.scaleVector(calcLead.y, calcLead.x));
                    bulletSprite.addSelf();
                    return;
                }
                break;
            }
            case 3: {
                if (this.m_teleportationCounter-- <= 0) {
                    this.setLocation(WHUtil.randABSInt() % Sprite.model.totalBoardW, WHUtil.randABSInt() % Sprite.model.totalBoardH);
                    this.m_framesDrawn = 0;
                    this.m_mode = 0;
                    super.m_damage = 0;
                    this.m_teleportationCounter = 45;
                    return;
                }
                break;
            }
        }
    }
}

package client;
import java.awt.*;
import javax.sound.sampled.*;

public class PlayerSprite extends Sprite
{
    public static final double noseDistance = 12.0;
    public double m_thrust;
    public int m_shieldCyclesLeft;
    private Sprite m_targetSprite;
    private int m_trackingFiringRate;
    private int m_targetSpriteCycles;
    private boolean m_bTrackingFireAtTarget;
    private double m_trackingTargetDistance;
    public Rectangle m_rectView;
    private int m_bulletDamage;
    private int m_fighterType;
    private boolean m_bTrackingCannon;
    private int m_shapeShifterFighterShape;
    private static final int MAX_HEATSEEKER_ROUNDS = 3;
    private int m_heatSeekerRounds;
    private int m_targetX;
    private int m_targetY;
    private boolean m_bFiringAttractor;
    private static final double POWERUP_ATTRACTION_POWER = 0.3;
    public static final int g_yoffset = -3;
    private static final int BAR_W = 5;
    private static final int BAR_H = 20;
    public static final int NUM_SHIP_TYPES = 8;
    public static final int SHIP_TYPE_TANK = 0;
    public static final int SHIP_TYPE_WING = 1;
    public static final int SHIP_TYPE_SQUID = 2;
    public static final int SHIP_TYPE_RABBIT = 3;
    public static final int SHIP_TYPE_TURTLE = 4;
    public static final int SHIP_TYPE_FLASH = 5;
    public static final int SHIP_TYPE_HUNTER = 6;
    public static final int SHIP_TYPE_FLAGSHIP = 7;
    public static final int SHIP_DATA_OFFSETY = 0;
    public static final int SHIP_DATA_SCALE_SMALL_ICON = 1;
    public static final int SHIP_DATA_SCALE_LARGE_DISPLAY = 2;
    public static final int SHIP_DATA_ROTATE = 3;
    public static final int SHIP_DATA_MAX_THRUST = 4;
    public static final int SHIP_DATA_ACCEL = 5;
    public static final int SHIP_DATA_HITPOINTS = 6;
    public static final int SHIP_DATA_GUN_UPGRADE_STATE = 7;
    public static final int SHIP_DATA_THRUST_UPGRADE_STATE = 8;
    public static final int SHIP_DATA_TRACKING_CANNON_AVAIL = 9;
    public static final int SHIP_DATA_TRACKING_CANNON_FIRING_RATE = 10;
    public static final int SHIP_DATA_SPECIAL_POWERUP = 11;
    public static final int SHIP_DATA_SPECIAL_POWERUP2 = 12;
    public static final int SHIP_DATA_SUB_LEVEL = 13;
    public static final int SHIP_DATA_NO_SPECIALS = 0;
    public static final int SHIP_DATA_TURTLE_CANNON = 1;
    public static final int SHIP_DATA_SHAPESHIFTER = 2;
    public static final int SHIP_DATA_HEATSEEKER = 3;
    public static final int SHIP_DATA_POWERUP_ATTRACTOR = 4;
    private double m_nextHSRegen;
    public static final int SHIP_DATA_HS_REGEN_TIME = 20000;
    public static final int NROTATIONS = 360;
    public static final int DROTATE = 360 / NROTATIONS;
    private double[][] m_turretLocations;
    public static final Polygon[][] g_polyShipCollision;
    public static final Polygon[][] g_polyShip;
    public static final double[][] g_fighterData;
    public static final String[][] g_shipDescriptions;
    static final short[][][] g_shipPoints;
    private static final int DEF_SHOT_DELAY = 3;
    private static final int[][] g_shotData;
    private static final Color[] g_bulletColors;
    private int m_specialType;
    private int m_trackingCannons;
    public static final int HALF_TARGET_LENGTH = 10;
    boolean m_bInvisible;
    String m_killedBy;
    byte m_killedBySlot;
    int m_lostHealth;
    public static final double dDecel = 0.995;
    int lastShotCycle;
    Polygon m_drawPoly;
    int thrustCount;
    boolean m_bRetros;
    boolean m_bThrusting;
    boolean m_bRapidfire;
    int m_thrustUpgradeStatus;
    int m_bulletType;
    int m_bulletSize;
    int m_numShots;
    int m_maxShots;
    int m_shotDelay;
    boolean m_bMaxShotUpgrade;
    boolean m_bMaxThrustUpgrade;
    private static final int EMP_DURATION = 150;
    private boolean m_bUnderEMPEffect;
    private int m_cyclesLeftUnderEMP;
    private int m_empType;
    private static final int FLASH_DELAY_DURATION = 10;
    private static final int FLASH_HEALTH_COST = 20;
    private static final int SHAPESHIFT_DELAY_DURATION = 4;
    private static final int HS_DELAY_DURATION = 4;
    private static final int PA_DELAY_DURATION = 4;
    private int m_nextTFireCycle;
    private static final String[] g_targetPriorityHS;
    private static final String[] g_targetPriorityNormal;
    private static final int shipX = 110;
    private static final int ROW1Y = -10;
    private static final int ROW2Y = 10;
    private static final int LEFTX = -85;
    private static final int RIGHTX = 50;
    
    void drawPermanentPowerups(final Graphics graphics) {
        final String s = "GUN: x";
        graphics.translate(110, 25);
        final Polygon polygon = PlayerSprite.g_polyShip[this.m_fighterType][0];
        graphics.setColor(super.m_color);
        graphics.drawPolygon(polygon.xpoints, polygon.ypoints, polygon.npoints);
        graphics.setColor(Color.green);
        graphics.drawOval(-8, -18, 16, 16);
        graphics.drawLine(-8, -10, -40, -10);
        graphics.drawString(s + this.m_bulletType, -85, -5);
        graphics.drawLine(8, -10, 40, -10);
        graphics.drawString("RAPID FIRE", 50, -5);
        graphics.drawString("THR: x" + this.m_thrustUpgradeStatus, -85, 10);
        graphics.drawLine(-40, 10, -20, 10);
        graphics.drawLine(-20, 10, 0, 7);
        graphics.drawString(this.m_bRetros ? "RETROS" : "NO RETROS", 50, 15);
        graphics.drawLine(40, 10, 20, 10);
        graphics.drawLine(20, 10, 8, 0);
        graphics.translate(-110, -25);
    }
    
    private void fireHeatSeeker() {
        if (this.m_heatSeekerRounds > 0) {
            --this.m_heatSeekerRounds;
            int n = 0;
            do {
                final HeatSeekerMissile heatSeekerMissile = new HeatSeekerMissile(super.intx, super.inty);
                heatSeekerMissile.setGood(this.m_targetX, this.m_targetY, Math.abs(9 - n) * 2);
                heatSeekerMissile.setDegreeAngle(super.angle + (8 - n) * 12);
                heatSeekerMissile.doMaxThrust(n * 4);
                heatSeekerMissile.addSelf();
            } while (++n < 17);
        }
    }
    
    public Rectangle getViewRect() {
        this.m_rectView.setLocation(super.intx - Sprite.model.boardHeight / 2, super.inty - Sprite.model.boardWidth / 2);
        return this.m_rectView;
    }
    
    void upgradeShot() {
        if (!this.m_bMaxShotUpgrade) {
            this.setShot(this.m_bulletType + 1);
            if (this.m_bulletType >= PlayerSprite.g_shotData.length - 1) {
                this.m_bMaxShotUpgrade = true;
            }
        }
    }
    
    private void handleTurtleCannon() {
        if (super.m_health > 20) {
            if (WHUtil.randABSInt() % 4 > 0) {
                this.changeHealth(-20);
            }
            Sprite.model.clearScreen();
        }
    }
    
    public void activateEMP() {
        this.m_bUnderEMPEffect = true;
        this.m_cyclesLeftUnderEMP = 150;
        this.m_empType = WHUtil.randABSInt() % 3;
    }
    
    public PlayerSprite(final int n, final int n2, final int n3) {
        super(n, n2);
        this.m_thrust = 0.45;
        this.m_rectView = new Rectangle();
        this.m_bulletDamage = 10;
        this.m_heatSeekerRounds = 3;
        this.m_killedBy = "";
        this.thrustCount = 0;
        this.init("player", n, n2, true);
        this.m_fighterType = n3;
        super.spriteType = 2;
        this.setBasicParams(n3);
        this.setHealth((int)PlayerSprite.g_fighterData[n3][6], 1000000);
        this.m_rectView.setSize(Sprite.model.boardWidth, Sprite.model.boardHeight);
        super.shapeType = 1;
        this.setShot(0);
        for (int n4 = 0; n4 < PlayerSprite.g_fighterData[n3][7]; ++n4) {
            this.upgradeShot();
        }
        if (PlayerSprite.g_fighterData[this.m_fighterType][8] >= 1.0) {
            this.m_thrustUpgradeStatus = (int)PlayerSprite.g_fighterData[this.m_fighterType][8];
            this.m_bRetros = true;
            this.m_bMaxThrustUpgrade = (this.m_thrustUpgradeStatus >= 3);
        }
        this.m_trackingCannons = (int)PlayerSprite.g_fighterData[this.m_fighterType][9];
        if (this.m_trackingCannons > 0) {
            this.m_turretLocations = new double[this.m_trackingCannons][2];
        }
        this.m_specialType = (int)PlayerSprite.g_fighterData[this.m_fighterType][11];
        if (this.m_specialType == 2) {
            this.m_shapeShifterFighterShape = 0;
            this.handleShapeShift();
        }
        this.rotate(0.0);
    }
    
    public void rotate(final double n) {
        super.rotate(n);
        final int n2 = (int)((super.angle + 90.0) / DROTATE) % NROTATIONS;
        final int n3 = (this.m_specialType == 2) ? this.m_shapeShifterFighterShape : this.m_fighterType;
        super.m_poly = PlayerSprite.g_polyShipCollision[n3][n2];
        this.m_drawPoly = PlayerSprite.g_polyShip[n3][n2];
        if (this.m_trackingCannons > 1) {
            this.m_turretLocations[0][0] = this.m_drawPoly.xpoints[0] * 0.8;
            this.m_turretLocations[0][1] = this.m_drawPoly.ypoints[0] * 0.8;
            this.m_turretLocations[1][0] = -this.m_drawPoly.xpoints[11] * 0.8;
            this.m_turretLocations[1][1] = -this.m_drawPoly.ypoints[11] * 0.8;
        }
    }
    
    private void setBasicParams(final int n) {
        super.dRotate = PlayerSprite.g_fighterData[n][3];
        super.maxThrust = PlayerSprite.g_fighterData[n][4];
        this.m_thrust = PlayerSprite.g_fighterData[n][5];
        this.m_trackingFiringRate = (int)PlayerSprite.g_fighterData[n][10];
    }
    
    public void drawSelf(final Graphics graphics) {
        if (this.m_bInvisible || super.shouldRemoveSelf) {
            return;
        }
        if (this.m_targetSprite != null && !this.m_targetSprite.shouldRemoveSelf) {
            graphics.setColor(super.m_color);
            WHUtil.drawTarget(graphics, this.m_targetSprite.intx, this.m_targetSprite.inty);
        }
        graphics.translate(super.intx, super.inty);
        if (this.m_specialType == 3) {
            int n = 0;
            do {
                if (n < this.m_heatSeekerRounds) {
                    graphics.setColor(super.m_color);
                    graphics.fillRect(-18, 28 - n * 6, 5, 5);
                }
                graphics.setColor(Color.gray);
                graphics.drawRect(-18, 28 - n * 6, 5, 5);
            } while (++n < 3);
            graphics.translate(-super.intx + this.m_targetX, -super.inty + this.m_targetY);
            graphics.setColor((this.m_heatSeekerRounds > 0) ? super.m_color : Color.gray);
            graphics.drawLine(0, -10, 0, 10);
            graphics.drawLine(-10, 0, 10, 0);
            graphics.translate(super.intx - this.m_targetX, super.inty - this.m_targetY);
        }
        graphics.setColor(super.m_color);
        graphics.drawPolygon(this.m_drawPoly.xpoints, this.m_drawPoly.ypoints, this.m_drawPoly.npoints);
        if (this.m_bUnderEMPEffect) {
            graphics.setColor(Color.white);
            int n2 = 0;
            do {
                WHUtil.drawCenteredCircle(graphics, WHUtil.randInt(3), WHUtil.randInt(3), 20);
                WHUtil.drawCenteredCircle(graphics, WHUtil.randInt(8), WHUtil.randInt(8), 15);
            } while (++n2 < 3);
        }
        if (this.m_bFiringAttractor) {
            int n3 = 300 - super.spriteCycle % 300;
            int n4 = 0;
            do {
                graphics.setColor(Sprite.g_colors[super.m_slot][(super.spriteCycle + n4 * 4) % 20]);
                n3 = (n3 + 100) % 300;
                WHUtil.drawCenteredCircle(graphics, 0.0, 0.0, n3);
            } while (++n4 < 3);
        }
        if (this.m_trackingCannons > 0) {
            for (int i = 0; i < this.m_trackingCannons; ++i) {
                graphics.setColor(super.m_color);
                WHUtil.fillCenteredCircle(graphics, this.m_turretLocations[i][0], this.m_turretLocations[i][1], 5);
                int n5;
                if (this.m_targetSprite == null) {
                    n5 = (int)super.angle;
                }
                else {
                    n5 = (int)WHUtil.findAngle(this.m_targetSprite.intx, this.m_targetSprite.inty, super.intx, super.inty);
                }
                graphics.setColor(Color.black);
                WHUtil.fillCenteredArc(graphics, this.m_turretLocations[i][0], this.m_turretLocations[i][1], 5, -n5 - 20, 40);
            }
        }
        if (this.m_shieldCyclesLeft > 0) {
            Color color = Color.gray;
            if (this.m_shieldCyclesLeft > 80) {
                color = Color.green;
            }
            else if (this.m_shieldCyclesLeft > 40) {
                color = Color.yellow;
            }
            graphics.setColor(color);
            if (this.m_fighterType == 7) {
                WHUtil.drawCenteredCircle(graphics, 0.0, 0.0, 28);
                WHUtil.drawCenteredCircle(graphics, 0.0, 0.0, 26);
            }
            else {
                WHUtil.drawCenteredCircle(graphics, 0.0, 0.0, 20);
                WHUtil.drawCenteredCircle(graphics, 0.0, 0.0, 18);
            }
        }
        if (super.m_health < super.MAX_HEALTH / 3) {
            graphics.setColor(Color.red);
        }
        else if (super.m_health < 2 * super.MAX_HEALTH / 3) {
            graphics.setColor(Color.yellow);
        }
        else {
            graphics.setColor(Color.green);
        }
        final int n6 = (int)(super.m_health*1.0 / super.MAX_HEALTH * 20.0);
        graphics.drawRect(18, 18, 5, 20);
        graphics.fillRect(18, 38 - n6, 5, n6);
        Sprite.model.drawTeamShape(graphics, 25, 15);
        graphics.translate(-super.intx, -super.inty);
        if (this.m_bThrusting) {
            this.drawThrust(graphics);
            this.m_bThrusting = false;
        }
    }
    
    void drawOneThrust(final double n, final int n2, final double n3, final int n4) {
        final ThrustSprite thrustSprite = new ThrustSprite((int)(super.x - n3 * (Math.cos(n) * 12.0)), (int)(super.y - n3 * (Math.sin(n) * 12.0)));
        thrustSprite.vectorx = -2.0 * super.vectorx;
        thrustSprite.vectory = -2.0 * super.vectory;
        thrustSprite.addSelf();
    }
    
    void setShot(final int bulletType) {
        this.m_bulletType = bulletType;
        this.m_bulletDamage = PlayerSprite.g_shotData[this.m_bulletType][0];
        this.m_bulletSize = PlayerSprite.g_shotData[this.m_bulletType][1];
        this.m_numShots = PlayerSprite.g_shotData[this.m_bulletType][2];
        this.m_maxShots = PlayerSprite.g_shotData[this.m_bulletType][3];
        this.m_shotDelay = PlayerSprite.g_shotData[this.m_bulletType][4];
        Sprite.model.refreshStatus = true;
    }
    
    public void handleTrackingCannon() {
        if (this.m_trackingCannons > 0) {
            --this.m_targetSpriteCycles;
            if (this.m_targetSprite == null || this.m_targetSprite.shouldRemoveSelf || !this.m_targetSprite.m_bInDrawingRect || this.m_targetSpriteCycles <= 0) {
                this.m_targetSpriteCycles = 0;
                this.m_targetSprite = this.findTrackingTarget(PlayerSprite.g_targetPriorityNormal, true, 0);
                this.m_targetSpriteCycles = this.m_trackingFiringRate;
                this.m_bTrackingFireAtTarget = true;
            }
            if (this.m_bTrackingFireAtTarget && this.m_targetSprite != null) {
                final int n = (this.m_trackingTargetDistance > 200.0) ? 20 : 10;
                final double angle = WHUtil.findAngle(this.m_targetSprite.x + this.m_targetSprite.vectorx * n, this.m_targetSprite.y + this.m_targetSprite.vectory * n, super.x, super.y);
                final double n2 = 12.0 * Math.cos(angle * 0.017453292519943295);
                final double n3 = 12.0 * Math.sin(angle * 0.017453292519943295);
                int bulletDamage = this.m_bulletDamage;
                if (this.m_numShots > 1) {
                    bulletDamage *= 2;
                }
                for (int i = 0; i < this.m_trackingCannons; ++i) {
                    final BulletSprite bulletSprite = new BulletSprite(super.intx + (int)this.m_turretLocations[i][0], super.inty + (int)this.m_turretLocations[i][1], bulletDamage, this.m_bulletSize, PlayerSprite.g_bulletColors[this.m_bulletType], 2);
                    bulletSprite.m_bCountTowardsQuota = false;
                    bulletSprite.setPlayer(super.m_slot);
                    bulletSprite.setVelocity(n2, n3);
                    bulletSprite.addSelf();
                }
                this.m_bTrackingFireAtTarget = false;
            }
        }
    }
    
    void upgradeThrust(final double n) {
        if (!this.m_bMaxThrustUpgrade) {
            ++this.m_thrustUpgradeStatus;
            this.m_thrust += n;
            Sprite.model.refreshStatus = true;
            this.m_bMaxThrustUpgrade = (this.m_thrustUpgradeStatus >= 3);
        }
    }
    
    void fireBullet() {
        switch (this.m_numShots) {
            case 1: {
                GameBoard.playSound("snd_fire");
                this.fireBullet(super.radAngle);
                break;
            }
            case 2: {
                GameBoard.playSound("snd_fire");
                this.fireBullet(super.radAngle - 0.05);
                this.fireBullet(super.radAngle + 0.05);
                break;
            }
            default: {}
        }
    }
    
    public void setCollided(final Sprite collided) {
        final int health = super.m_health;
        super.setCollided(collided);
        if (super.shouldRemoveSelf) {
            if (collided.m_color != null) {
                this.m_killedBy = Sprite.model.getPlayer(collided.m_slot);
                this.m_killedBySlot = collided.m_slot;
            }
            if (this.m_killedBy != null && !this.m_killedBy.equals("")) {
                Sprite.model.writeEvent("killed by " + this.m_killedBy);
                Sprite.model.m_killedBy = this.m_killedBySlot;
            }
            new ExplosionSprite(super.intx, super.inty, super.m_slot).addSelf();
            new ShrapnelSprite(super.intx, super.inty, 30, Sprite.model.m_color, 50).addSelf();
            int n = 0;
            do {
                final int n2 = super.intx + WHUtil.randInt(10);
                final int n3 = super.inty + WHUtil.randInt(10);
                new ExplosionSprite(n2, n3, super.m_slot).addSelf();
                new ShrapnelSprite(n2, n3, 30, Sprite.model.m_color, 50).addSelf();
            } while (++n < 3);
            return;
        }
        if (health != super.m_health) {
            Sprite.model.refreshStatus = true;
            Sprite.model.m_strDamagedByPlayer = null;
            if (collided.m_color != null && collided.m_bSentByPlayer) {
                Sprite.model.m_strDamagedByPlayer = Sprite.model.getPlayer(collided.m_slot);
                Sprite.model.m_damagingPowerup = collided.m_powerupType;
                this.m_lostHealth = health - super.m_health;
            }
            new ShrapnelSprite(super.intx, super.inty, 10, Sprite.model.m_color).addSelf();
        }
    }
    
    private void fireBullet(final double n) {
        final BulletSprite bulletSprite = new BulletSprite((int)(Math.cos(n) * 12.0 + super.x), (int)(Math.sin(n) * 12.0 + super.y), this.m_bulletDamage, this.m_bulletSize, PlayerSprite.g_bulletColors[this.m_bulletType], 2);
        bulletSprite.setPlayer(super.m_slot);
        bulletSprite.setVelocity(Math.cos(n) * 10.0 + super.vectorx, Math.sin(n) * 10.0 + super.vectory);
        bulletSprite.addSelf();
        this.lastShotCycle = super.spriteCycle + this.m_shotDelay;
    }
    
    private void firePowerupAttractor() {
        for (int i = 0; i < Sprite.model.badGuys.maxElement; ++i) {
            final Sprite sprite = Sprite.model.badGuys.sprites[i];
            if (sprite != null && !sprite.shouldRemoveSelf && sprite.m_bInDrawingRect) {
                final int n = sprite.intx - super.intx;
                final int n2 = sprite.inty - super.inty;
                double n3 = 0.3 * ((300.0 - WHUtil.hyp(n, n2)) / 300.0);
                if (!sprite.name.equals("pup")) {
                    n3 *= -0.2;
                }
                final Sprite sprite2 = sprite;
                sprite2.vectorx += ((n > 0) ? (-n3) : n3);
                final Sprite sprite3 = sprite;
                sprite3.vectory += ((n2 > 0) ? (-n3) : n3);
            }
        }
    }
    
    void enableRetros() {
        if (!this.m_bRetros) {
            this.m_bRetros = true;
            Sprite.model.refreshStatus = true;
        }
    }
    
    static {
        g_polyShipCollision = new Polygon[8][NROTATIONS];
        g_polyShip = new Polygon[8][NROTATIONS];
        //g_fighterData = new double[][] { { 3.0, 1.0, 4.0, 6.0, 6.0, 0.18, 260.0, 2.0, 0.0, 0.0, 0.0, 0.0, 0.0, 10.0 }, { 4.0, 1.0, 4.0, 10.0, 6.8, 0.25, 230.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 10.0 }, { 0.0, 1.0, 4.0, 12.0, 10.0, 0.48, 200.0, 0.0, 3.0, 0.0, 0.0, 0.0, 0.0, 10.0 }, { -2.0, 1.0, 4.0, 12.0, 11.0, 0.35, 180.0, 0.0, 2.0, 1.0, 12.0, 0.0, 0.0, 12.0 }, { 0.0, 1.0, 4.0, 4.5, 5.2, 0.15, 250.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 12.0 }, { 0.0, 1.0, 4.0, 1.0, 1.0, 0.1, 190.0, 3.0, 3.0, 0.0, 0.0, 2.0, 0.0, 14.0 }, { 0.0, 1.0, 4.0, 4.8, 7.0, 0.3, 220.0, 0.0, 1.0, 0.0, 0.0, 3.0, 0.0, 12.0 }, { 0.0, 0.5, 2.0, 2.0, 3.9, 0.11, 300.0, 0.0, 2.0, 2.0, 14.0, 4.0, 0.0, 14.0 } };
        g_fighterData = new double[][] { { 3.0, 1.0, 3.0, 5.0, 6.0, 0.10, 280.0, 2.0, 0.0, 0.0, 0.0, 0.0, 0.0, 10.0 }, { 4.0, 1.0, 3.0, 7.0, 7.0, 0.25, 240.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 10.0 }, { 0.0, 1.0, 3.0, 10.0, 10.0, 0.48, 200.0, 0.0, 3.0, 0.0, 0.0, 0.0, 0.0, 10.0 }, { -2.0, 1.0, 3.0, 12.0, 11.0, 0.35, 180.0, 0.0, 2.0, 1.0, 12.0, 0.0, 0.0, 12.0 }, { 0.0, 1.0, 3.0, 4.5, 5.2, 0.15, 250.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 12.0 }, { 0.0, 1.0, 3.0, 1.0, 1.0, 0.1, 190.0, 3.0, 3.0, 0.0, 0.0, 2.0, 0.0, 14.0 }, { 0.0, 1.0, 3.0, 4.8, 7.0, 0.3, 220.0, 0.0, 1.0, 0.0, 0.0, 3.0, 0.0, 12.0 }, { 0.0, 0.5, 1.5, 2.0, 3.9, 0.11, 300.0, 0.0, 2.0, 2.0, 14.0, 4.0, 0.0, 14.0 } };
        g_shipDescriptions = new String[][] { { "The Tank", "The Tank is the ultimate in", "destructive capabilities. Meant to slug it", "out with larger ships, the Tank's armor", "& guns are fomidable right off the bat.", "Item acquisition is much slower, but", "with increased firepower, the board", "should be littered with the items from", "the carcasses of your enemies" }, { "The Wing", "The Wing is a balanced mix of speed", "& armor.  The Wing is specially designed", "to be a smaller target for the numerous", "enemies you are to face.  The Wing", "offers a good compromise for those", "starting off in the New Grounds." }, { "The Squid", "The Squid is a light ship designed", "for quick item acquisition on the field", "of battle.  The thrusters have been", "maxed out and the speed and accel.", "borders on reckless. The light armor is", "balanced with an increase in evasion", "abilities.", "Only those of fast reflexes need apply." }, { "The Rabbit", "The Rabbit is a light ship designed", "for hit and run engagements. The Rabbit", "sacrifices armor for a special tracking", "cannon typical of corvettes and larger", "ships.  Upgrade your weapon systems to", "maximize the effectiveness of this ship." }, { "The Turtle", "The Turtle is a modified Tank with", "a built-in high powered weapon, the", "Turtle Cannon.  The TC destroys all", "visible targets, making it a formidable", "ship.  The main drawback is that the", "TC is so effective that the Turtle", "often takes damage when using it.", "Use the 'd' key to activate Turtle Cannon." }, { "The Flash", "The Flash is an experimental 'hybrid'", "ship.  It can tranform between two", "states, the Squid and Tank states,", "where it can mimic that particular ship.", "The benefit of the Flash is the pilot can", "stand and fight or hit and run when", "necessary. The downside is that the", "Flash cannot be upgraded...", "Use the 'd' key to transform." }, { "The Hunter", "The Hunter is a fast, but not very", "agile missile corvette.  Its array of 17", "Piranha missiles can function as both", "an offensive and defensive weapon.", "The Piranhas are designed as an area", "effect weapon, and circle in close", "proximity of the targetted area.", "Hunter can generate new missiles over", "time, or the pilot can refill his arsenal", "by capturing HeatSeeker powerups.", "Use the 'd' key to use missiles." }, { "The Flagship", "The Flagship is a capitol ship, meant", "to command a squadron of fighters.", "Center Fleet has decided to include", "testing the Flagship in battle scenarios.", "The Flagship contains a large", "attracter/repulser (A/R) unit that draws", "powerups in, and pushes enemies out.", "The drawback is that when the A/R unit", "is on, there is not enough power to run", "the tracking guns, thrusters, or main", "cannon.", "Use the 'd' key to activate A/R." } };
        g_shipPoints = new short[][][] { { { -3, -14, 0 }, { -3, -18, 1 }, { -5, -15, 0 }, { -7, -3, 0 }, { -19, -6, 1 }, { -16, 1, 1 }, { -9, 5, 0 }, { -6, 8, 1 } }, { { 0, -18, 1 }, { -4, -4, 0 }, { -12, 5, 1 }, { -5, 5, 0 }, { -3, 9, 1 } }, { { -3, -16, 1 }, { -6, 14, 0 }, { -10, -7, 1 }, { -12, -2, 1 }, { -12, 2, 1 }, { -5, 19, 1 }, { -8, 2, 0 }, { -3, 2, 0 }, { 0, 22, 1 } }, { { -3, -12, 1 }, { -6, -3, 1 }, { -6, 3, 1 }, { -10, 5, 0 }, { -10, 20, 0 }, { -3, 20, 0 }, { -3, 5, 0 }, { -10, 5, 0 }, { -6, 10, 1 } }, { { 0, -18, 1 }, { -4, -15, 1 }, { -4, -12, 0 }, { -7, -9, 0 }, { -13, -10, 1 }, { -10, -6, 1 }, { -10, 7, 1 }, { -13, 13, 1 }, { -7, 10, 1 }, { 0, 15, 1 } }, { { 0, -15, 0 }, { -15, 11, 0 }, { -5, 5, 0 }, { -10, 11, 0 }, { 0, 7, 0 } }, { { 0, -18, 1 }, { -7, 9, 0 }, { -13, 10, 1 }, { -10, 6, 0 }, { -4, 15, 0 }, { -4, 12, 0 }, { 0, 18, 1 } }, { { 0, -37, 0 }, { -15, -37, 1 }, { -15, -24, 0 }, { -8, -24, 0 }, { -8, -15, 0 }, { -22, -15, 0 }, { -22, -19, 0 }, { -29, -19, 1 }, { -29, 19, 1 }, { -22, 19, 0 }, { -22, 12, 0 }, { 0, 12, 0 } }, { { 0, -25, 0 }, { -10, -25, 1 }, { -10, -16, 0 }, { -5, -16, 0 }, { -5, -10, 0 }, { -15, -10, 0 }, { -15, -13, 0 }, { -19, -13, 1 }, { -19, 13, 1 }, { -15, 13, 0 }, { -15, 8, 0 }, { 0, 8, 0 } } };
        //g_shotData = new int[][] { { 10, 5, 1, 20, 3 }, { 14, 5, 1, 14, 2 }, { 8, 5, 2, 28, 2 }, { 10, 5, 2, 34, 2 } };
        g_shotData = new int[][] { { 10, 5, 1, 20, 8 }, { 14, 5, 1, 14, 6 }, { 8, 5, 2, 28, 6 }, { 10, 5, 2, 34, 6 } };
        //g_bulletColors = new Color[] { Color.white, Color.blue, Color.red, Color.red };
        g_bulletColors = new Color[] { Color.white, Color.blue, Color.magenta, Color.red };
        g_targetPriorityHS = new String[] { "trt", "gs", "ufo", "art", "ml", "scb", "wc", "inf", "wh" };
        g_targetPriorityNormal = new String[] { "trt", "art", "gs", "ufo", "ml", "scb", "inf", "wc", "mns", "blt", "hs", "wh" };
    }
    
    public void removeSelf() {
        super.shouldRemoveSelf = true;
        Sprite.model.gameOver = true;
        this.m_bInvisible = true;
    }
    
    private void handleShapeShift() {
        if (this.m_shapeShifterFighterShape == 0) {
            this.m_shapeShifterFighterShape = 2;
        }
        else {
            this.m_shapeShifterFighterShape = 0;
        }
        this.setBasicParams(this.m_shapeShifterFighterShape);
        this.setShot((int)PlayerSprite.g_fighterData[this.m_shapeShifterFighterShape][7]);
        this.rotate(0.0);
        Sprite.model.m_flashScreenColor = super.m_color;
    }
    
    void drawThrust(final Graphics graphics) {
        if (this.thrustCount > 3) {
            final int n = super.spriteCycle % 20;
            this.drawOneThrust((super.angle + n) * 0.017453292519943295, 1 + WHUtil.randInt() % 2, 3.0, 0);
            this.drawOneThrust((super.angle - n) * 0.017453292519943295, 1 + WHUtil.randInt() % 2, 3.0, 0);
        }
        this.drawOneThrust(super.radAngle, Math.min(this.thrustCount, 5), 2.0, 0);
    }
    
    void handleThrust() {
        this.m_bThrusting = true;
        this.doMaxThrust(this.m_thrust);
        GameBoard.playSound("snd_thrust");
    }
    
    void firePowerup() {
        if (Sprite.model.m_numPowerups > 0) {
            final int n = (int)(Math.cos(super.radAngle) * 12.0 + super.x);
            final int n2 = (int)(Math.sin(super.radAngle) * 12.0 + super.y);
            GameBoard.playSound("snd_fire");
            Sprite.model.refreshStatus = true;
            final WormholeModel model = Sprite.model;
            --model.m_numPowerups;
            final BulletSprite bulletSprite = new BulletSprite(n, n2, 100, 20, Color.orange, 2);
            bulletSprite.setPowerup(Sprite.model.m_powerups[Sprite.model.m_numPowerups]);
            if (bulletSprite.m_powerupType == 18) {
                bulletSprite.m_upgradeLevel = 2;
            }
            bulletSprite.setVelocity(Math.cos(super.radAngle) * 10.0 + super.vectorx, Math.sin(super.radAngle) * 10.0 + super.vectory);
            bulletSprite.addSelf();
            this.lastShotCycle = super.spriteCycle + this.m_shotDelay;
        }
    }
    
    public boolean passOnPowerup(final int n) {
        if (this.m_specialType == 3 && n == 6 && this.m_heatSeekerRounds < 3) {
            this.m_heatSeekerRounds = 3;
            return false;
        }
        return true;
    }
    
    private Sprite findTrackingTarget(final String[] array, final boolean b, final int n) {
        if (this.m_targetSpriteCycles <= 0) {
            int n2 = -1;
            int n3 = array.length - 1;
            this.m_trackingTargetDistance = 100000.0;
            int n4 = 1;
            for (int i = 0; i < Sprite.model.badGuys.maxElement; ++i) {
                final Sprite sprite = Sprite.model.badGuys.sprites[i];
                if (sprite != null && !sprite.shouldRemoveSelf && sprite.m_bInDrawingRect) {
                    for (int j = 0; j <= n3; ++j) {
                        if (sprite.name.equals(array[j])) {
                            if (!b) {
                                n4 = ((Math.abs((WHUtil.findAngle(sprite.intx, sprite.inty, super.intx, super.inty) + 360.0) % 360.0 - super.angle) % 360.0 < n) ? 1 : 0);
                            }
                            if (n4 != 0) {
                                final double distance = WHUtil.distanceFrom(sprite, this);
                                if (j == n3) {
                                    if (distance < this.m_trackingTargetDistance) {
                                        this.m_trackingTargetDistance = distance;
                                        n2 = i;
                                    }
                                }
                                else {
                                    this.m_trackingTargetDistance = distance;
                                    n3 = j;
                                    n2 = i;
                                }
                            }
                        }
                    }
                }
            }
            if (n2 >= 0) {
                return Sprite.model.badGuys.sprites[n2];
            }
        }
        return null;
    }
    
    public static final void initClass(final int n) {
        int n2 = 0;
        do {
            final RotationalPolygon constructPolygon = RotationalPolygon.constructPolygon(PlayerSprite.g_shipPoints[n2], true);
            final RotationalPolygon constructPolygon2 = RotationalPolygon.constructPolygon(PlayerSprite.g_shipPoints[n2], false);
            constructPolygon.rotate(0.0);
            constructPolygon2.rotate(0.0);
            int n3 = 0;
            do {
                PlayerSprite.g_polyShip[n2][n3] = constructPolygon.cloneMyPolygon();
                PlayerSprite.g_polyShipCollision[n2][n3] = constructPolygon2.cloneMyPolygon();
                constructPolygon.rotate(DROTATE);
                constructPolygon2.rotate(DROTATE);
            } while (++n3 < NROTATIONS);
        } while (++n2 < 8);
    }
    
    public void behave() {
        if (this.m_shieldCyclesLeft > 0) {
            --this.m_shieldCyclesLeft;
            super.indestructible = true;
        }
        else {
            super.indestructible = false;
        }
        super.behave();
        int n = Sprite.model.left;
        int n2 = Sprite.model.right;
        int n3 = Sprite.model.up;
        int n4 = Sprite.model.fire;
        int n5 = Sprite.model.secondaryFire;
        final int tertiaryFire = Sprite.model.tertiaryFire;
        if (this.m_bUnderEMPEffect) {
            if (this.m_cyclesLeftUnderEMP-- < 1) {
                this.m_bUnderEMPEffect = false;
            }
            else {
                n = Sprite.model.right;
                n2 = Sprite.model.left;
                switch (this.m_empType) {
                    case 0: {
                        n4 = Sprite.model.up;
                        n3 = Sprite.model.fire;
                        break;
                    }
                    case 1: {
                        n5 = Sprite.model.fire;
                        break;
                    }
                    case 2: {
                        n4 = Sprite.model.right;
                        n2 = Sprite.model.up;
                        n3 = Sprite.model.left;
                        n = Sprite.model.fire;
                        break;
                    }
                }
            }
        }
        if (this.m_specialType == 3) {
            this.m_targetX = super.intx + (int)(200.0 * Math.cos(super.radAngle));
            this.m_targetY = super.inty + (int)(200.0 * Math.sin(super.radAngle));
            if (System.currentTimeMillis() > this.m_nextHSRegen) {
                if (this.m_heatSeekerRounds < 3) {
                    ++this.m_heatSeekerRounds;
                }
                this.m_nextHSRegen = System.currentTimeMillis() + 20000L;
            }
        }
        boolean b = true;
        boolean b2 = true;
        if (tertiaryFire > 0) {
            if (super.spriteCycle > this.m_nextTFireCycle) {
                switch (this.m_specialType) {
                    case 1: {
                        this.handleTurtleCannon();
                        this.m_nextTFireCycle = super.spriteCycle + 10;
                        break;
                    }
                    case 2: {
                        this.handleShapeShift();
                        this.m_nextTFireCycle = super.spriteCycle + 4;
                        break;
                    }
                    case 3: {
                        this.fireHeatSeeker();
                        this.m_nextTFireCycle = super.spriteCycle + 4;
                        break;
                    }
                    case 4: {
                        this.firePowerupAttractor();
                        this.m_bFiringAttractor = true;
                        b = (b2 = false);
                        break;
                    }
                }
            }
        }
        else {
            this.m_bFiringAttractor = false;
        }
        if (this.m_trackingCannons > 0 && b) {
            this.handleTrackingCannon();
        }
        if (n > 0) {
            this.rotate(-super.dRotate);
        }
        if (n2 > 0) {
            this.rotate(super.dRotate);
        }
        if (n3 > 0 && b2) {
            ++this.thrustCount;
            this.handleThrust();
        }
        else {
            this.thrustCount = 0;
            this.m_bThrusting = false;
        }
        if (this.m_bRetros && !this.m_bThrusting && !this.m_bUnderEMPEffect) {
            this.decel(0.995);
        }
        if (b) {
            if (n5 > 0 && this.lastShotCycle < super.spriteCycle) {
                this.firePowerup();
            }
            if (n4 > 0 && this.lastShotCycle < super.spriteCycle && BulletSprite.g_nBullets < this.m_maxShots) {
                this.fireBullet();
            }
        }
    }
    
    public Rectangle getShapeRect() {
        final Rectangle bounds = super.m_poly.getBounds();
        bounds.move(super.intx - bounds.width / 2, super.inty - bounds.height / 2);
        return bounds;
    }
}

package client;
import java.util.*;
import java.awt.*;
import java.awt.image.*;

public class PortalSprite extends Sprite
{
    PlayerInfo m_info;
    double m_currentDegrees;
    double m_currentArcs;
    static final double ARC_SPEED = 0.5;
    boolean m_bGenEnemy;
    static final int BASE_W = 30;
    static final int MAX_W = 60;
    int m_damageTaken;
    final int MAX_TAKEN = 150;
    Vector<BulletSprite> m_vOutgoingPowerups;
    static final int NMISSILES = 12;
    static final int NMINES = 15;
    static final double MINE_VEL = 6.0;
    static final int NUMPOWERUPQ = 30;
    int[] m_powerupQ;
    byte[] m_powerupUpgradeQ;
    int[] m_powerupCycleQ;
    byte[] m_powerupSlotQ;
    static final int POWERUP_DELAY = 30;
    Rectangle m_viewingRect;
    private static double m_warpDx;
    private double m_warpDist;
    private boolean m_bWarpingIn;
    
    void genMines(final int n, final int n2, final byte player) {
        final double n3 = 0.4188790204786391;
        double n4 = 0.0;
        int n5 = 0;
        do {
            final MineSprite mineSprite = new MineSprite(n, n2);
            mineSprite.vectorx = Math.cos(n4) * 6.0;
            mineSprite.vectory = Math.sin(n4) * 6.0;
            mineSprite.setPlayer(player);
            mineSprite.addSelf();
            n4 += n3;
        } while (++n5 < 15);
    }
    
    void setOrbit() {
        if (!this.m_bWarpingIn) {
            this.setLocation(WormholeModel.gOrbitDistance * Math.cos(this.m_currentArcs) + Sprite.g_centerX, WormholeModel.gOrbitDistance * Math.sin(this.m_currentArcs) + Sprite.g_centerY);
            this.m_currentDegrees += 0.5;
            this.m_currentDegrees %= 360.0;
            this.m_currentArcs = this.m_currentDegrees * 0.017453292519943295;
            return;
        }
        if (this.m_warpDist < WormholeModel.gOrbitDistance) {
            this.setLocation(this.m_warpDist * Math.cos(this.m_currentArcs) + Sprite.g_centerX, this.m_warpDist * Math.sin(this.m_currentArcs) + Sprite.g_centerY);
            this.m_warpDist += Math.max(6.0, WormholeModel.gOrbitDistance - this.m_warpDist) / 3.0;
            return;
        }
        this.m_bWarpingIn = false;
    }
    
    public PortalSprite(final int n, final PlayerInfo info) {
        super(0, 0);
        this.m_vOutgoingPowerups = new Vector();
        this.m_powerupQ = new int[30];
        this.m_powerupUpgradeQ = new byte[30];
        this.m_powerupCycleQ = new int[30];
        this.m_powerupSlotQ = new byte[30];
        this.m_currentDegrees = n;
        this.m_currentArcs = this.m_currentDegrees * 0.017453292519943295;
        this.setOrbit();
        this.init("wh", super.intx, super.inty, true);
        super.spriteType = 1;
        super.shapeRect = new Rectangle(super.intx - 60, super.inty - 30, 120, 60);
        this.m_viewingRect = new Rectangle(100, 130);
        super.indestructible = true;
        super.m_damage = 0;
        this.m_info = info;
        super.m_color = this.m_info.m_color;
        super.m_slot = (byte)this.m_info.m_slot;
    }
    
    void genEnemy(final int n, final int n2, final int n3, final byte player, final byte b) {
        int n4 = PowerupSprite.g_enemyRatios[n3];
        if (n3 == 18) {
            n4 += b;
        }
        for (byte b2 = 0; b2 < n4; ++b2) {
            final int n5 = n + WHUtil.randInt(70);
            final int n6 = n2 + WHUtil.randInt(70);
            Sprite sprite = null;
            switch (n3) {
                case 9: {
                    sprite = new UFOSprite(n5, n6);
                    break;
                }
                case 10: {
                    sprite = new InflatorSprite(n5, n6);
                    break;
                }
                case 11: {
                    sprite = new MineLayerSprite(n5, n6);
                    break;
                }
                case 12: {
                    sprite = new GunshipSprite(n5, n6);
                    break;
                }
                case 15: {
                    sprite = new WallCrawlerSprite(n5, n6, WHUtil.randABSInt() % 2 == 0);
                    break;
                }
                case 13: {
                    sprite = new ScarabSprite(n5, n6, this);
                    break;
                }
                case 16: {
                    sprite = new PortalBeamSprite(this);
                    break;
                }
                case 7: {
                    sprite = new PortalTurretSprite(this);
                    break;
                }
                case 17: {
                    sprite = new EMPSprite(this);
                    break;
                }
                case 18: {
                    sprite = new GhostPudSprite(this, b2);
                    break;
                }
                case 19: {
                    sprite = new ArtillerySprite(n5, n6);
                    break;
                }
                default: {
                    sprite = new InflatorSprite(n5, n6);
                    break;
                }
            }
            sprite.setPlayer(player);
            sprite.setDegreeAngle(WHUtil.randABSInt() % 360);
            sprite.addSelf();
        }
    }
    
    public void drawSelf(final Graphics graphics) {
        if (this.m_info.m_bEmpty) {
            return;
        }
        int n = 30;
        do {
            graphics.setColor(Sprite.g_colors[super.m_slot][(super.spriteCycle + n) % 20]);
            graphics.drawOval(super.intx - n, super.inty - n / 2, n * 2, n);
        } while (++n < 60);
        graphics.setColor(this.m_info.m_color);
        graphics.setFont(WormholeModel.fontLarge);
        graphics.drawString(this.m_info.m_username + "'s WORMHOLE", super.intx - 70, super.inty + 60);
        Sprite.model.drawEnemyTeamShape(graphics, super.intx - 70, super.inty + 70);
        for (int i = this.m_vOutgoingPowerups.size() - 1; i >= 0; --i) {
            final BulletSprite bulletSprite = this.m_vOutgoingPowerups.elementAt(i);
            bulletSprite.setLocation(bulletSprite.x * 0.95, bulletSprite.y * 0.95);
            graphics.drawImage(WormholeModel.getImages("img_smallpowerups")[PowerupSprite.convertToSmallImage(bulletSprite.m_powerupType)], super.intx + bulletSprite.intx - 8, super.inty + bulletSprite.inty - 5, null);
            if (bulletSprite.spriteCycle++ > 9) {
                this.m_vOutgoingPowerups.removeElementAt(i);
            }
        }
    }
    
    public void setCollided(final Sprite sprite) {
        if (sprite.m_bIsBullet) {
            sprite.shouldRemoveSelf = true;
            sprite.setCollided(this);
            this.m_damageTaken += sprite.m_damage;
            if (this.m_damageTaken > 150) {
                PowerupSprite.genPowerup(super.intx, super.inty).addSelf();
                this.m_damageTaken = 0;
            }
            if (sprite.m_bIsHeatSeeker) {
                return;
            }
            final BulletSprite bulletSprite = (BulletSprite)sprite;
            if (bulletSprite.m_bPowerup) {
                this.m_vOutgoingPowerups.addElement(bulletSprite);
                bulletSprite.setLocation(bulletSprite.x - super.x, bulletSprite.y - super.y);
                bulletSprite.spriteCycle = 0;
                Sprite.model.usePowerup((byte)bulletSprite.m_powerupType, bulletSprite.m_upgradeLevel, (byte)this.m_info.m_slot, Sprite.model.m_gameSession, WormholeModel.m_gameID);
            }
        }
    }
    
    void genBadPowerupEffect(final int n, final byte b, final byte b2) {
        int n2 = 0;
        while (this.m_powerupCycleQ[n2] != 0) {
            if (++n2 >= 30) {
                return;
            }
        }
        this.m_powerupCycleQ[n2] = super.spriteCycle + 30;
        this.m_powerupUpgradeQ[n2] = b2;
        this.m_powerupQ[n2] = n;
        this.m_powerupSlotQ[n2] = b;
    }
    
    void genNuke(final int n, final int n2, final byte b) {
        final NukeSprite nukeSprite = new NukeSprite(n, n2, b);
        nukeSprite.setVelocity((n - Sprite.g_centerX) / 125.0, (n2 - Sprite.g_centerY) / 125.0);
        nukeSprite.addSelf();
    }
    
    boolean inViewingRect(final Rectangle rectangle) {
        this.m_viewingRect.move(super.shapeRect.x, super.shapeRect.y);
        return rectangle.intersects(this.m_viewingRect);
    }
    
    public void behave() {
        super.behave();
        this.setOrbit();
        if (this.m_bGenEnemy) {
            switch (WHUtil.randABSInt() % 5) {
                case 0:
                case 1: {
                    new InflatorSprite(super.intx, super.inty).addSelf();
                    break;
                }
                case 2:
                case 3: {
                    new UFOSprite(super.intx, super.inty).addSelf();
                    break;
                }
                case 4: {
                    new GunshipSprite(super.intx, super.inty).addSelf();
                    break;
                }
            }
            this.m_bGenEnemy = false;
        }
        int n = 0;
        do {
            if (this.m_powerupCycleQ[n] != 0 && this.m_powerupCycleQ[n] < super.spriteCycle) {
                this.m_powerupCycleQ[n] = 0;
                switch (this.m_powerupQ[n]) {
                    default: {
                        continue;
                    }
                    case 6: {
                        int n2 = 0;
                        do {
                            final HeatSeekerMissile heatSeekerMissile = new HeatSeekerMissile(super.intx + WHUtil.randInt() % 50, super.inty + WHUtil.randInt() % 50);
                            heatSeekerMissile.rotate(WHUtil.randABSInt() % 360);
                            heatSeekerMissile.doMaxThrust(heatSeekerMissile.maxThrust);
                            heatSeekerMissile.addSelf();
                            heatSeekerMissile.setPlayer(this.m_powerupSlotQ[n]);
                        } while (++n2 < 12);
                        continue;
                    }
                    case 8: {
                        this.genMines(super.intx, super.inty, this.m_powerupSlotQ[n]);
                        continue;
                    }
                    case 7:
                    case 9:
                    case 10:
                    case 11:
                    case 12:
                    case 13:
                    case 15:
                    case 16:
                    case 17:
                    case 18:
                    case 19: {
                        this.genEnemy(super.intx, super.inty, this.m_powerupQ[n], this.m_powerupSlotQ[n], this.m_powerupUpgradeQ[n]);
                        continue;
                    }
                    case 14: {
                        this.genNuke(super.intx, super.inty, this.m_powerupSlotQ[n]);
                        continue;
                    }
                }
            }
        } while (++n < 30);
    }
    
    public void setWarpingIn() {
        this.m_bWarpingIn = true;
        this.m_warpDist = 0.0;
        PortalSprite.m_warpDx = WormholeModel.gOrbitDistance / 30.0;
    }
}

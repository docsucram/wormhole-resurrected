package client;
import java.awt.*;
import java.awt.image.*;
import javax.sound.sampled.*;

public class PowerupSprite extends Sprite
{
    int ctype;
    int powerupType;
    public static final int PORTAL_HEAT_SEEKER = 6;
    public static final int PORTAL_TURRET = 7;
    public static final int PORTAL_MINES = 8;
    public static final int PORTAL_UFO = 9;
    public static final int PORTAL_INFLATER = 10;
    public static final int PORTAL_MINELAYER = 11;
    public static final int PORTAL_GUNSHIP = 12;
    public static final int PORTAL_SCARAB = 13;
    public static final int PORTAL_NUKE = 14;
    public static final int PORTAL_WALLCRAWLER = 15;
    public static final int PORTAL_SWEEP_BEAM = 16;
    public static final int PORTAL_EMP = 17;
    public static final int PORTAL_GHOST_PUD = 18;
    public static final int PORTAL_ARTILLERY = 19;
    private static final int PORTAL_LOWEST_SMALL_POWERUP = 6;
    private static final int PORTAL_LOWEST_SENDABLE_POWERUP = 6;
    private static final int PORTAL_HIGHEST_SENDABLE_POWERUP = 19;
    private static final int PORTAL_HIGHEST_SENDABLE_NONSUBSCRIPTION_POWERUP = 16;
    private static final int PORTAL_NUMBER_SENDABLE_POWERUPS = 14;
    private static final int PORTAL_NUMBER_SENDABLE_NONSUBSCRIPTION_POWERUPS = 11;
    public static final int GUN_UPGRADE = 0;
    public static final int THRUST_UPGRADE = 1;
    public static final int RETROS = 2;
    public static final int INVULNERABILITY = 3;
    public static final int CLEAR_SCREEN = 4;
    public static final int EXTRA_HEALTH = 5;
    private static final int PORTAL_LOWEST_NONSENDABLE_POWERUP = 0;
    private static final int PORTAL_NUMBER_NONSENDABLE_POWERUP = 6;
    public static final int[] g_enemyRatios;
    static final int[] g_largeConverstionTypes;
    private static final int[] g_smallConverstionTypes;
    static final String[] g_names;
    static final int DSHIELD_UPGRADE_VALUE = 30;
    static final double DTHRUST_UPGRADE_VALUE = 0.1;
    
    public PowerupSprite(final int n, final int n2, final int powerupType) {
        super(n, n2);
        this.ctype = 4;
        this.init("pup", n, n2, true);
        super.spriteType = 1;
        super.shapeRect = new Rectangle(n - 17, n2 - 17, 34, 34);
        this.setHealth(10, 0);
        this.powerupType = powerupType;
        super.indestructible = true;
    }
    
    public void drawSelf(final Graphics graphics) {
        graphics.setColor(Sprite.g_colors[this.ctype][super.spriteCycle % 20]);
        WHUtil.fillCenteredCircle(graphics, super.intx, super.inty, 16);
        graphics.drawImage(WormholeModel.getImages("img_powerups")[PowerupSprite.g_largeConverstionTypes[this.powerupType]], super.intx - 14, super.inty - 14, null);
    }
    
    void givePowerupTo(final PlayerSprite playerSprite) {
        GameBoard.playSound("snd_powerup");
        switch (this.powerupType) {
            case 0: {
                playerSprite.upgradeShot();
                break;
            }
            case 1: {
                playerSprite.upgradeThrust(0.1);
                break;
            }
            case 2: {
                playerSprite.enableRetros();
                break;
            }
            case 3: {
                playerSprite.m_shieldCyclesLeft = Math.max(450, playerSprite.m_shieldCyclesLeft + 200);
                break;
            }
            case 4: {
                Sprite.model.clearScreen();
                break;
            }
            case 5: {
                playerSprite.changeHealth(30);
                break;
            }
            default: {
                if (playerSprite.passOnPowerup(this.powerupType)) {
                    Sprite.model.addPowerup(this.powerupType);
                }
                break;
            }
        }
    }
    
    public void setCollided(final Sprite collided) {
        super.setCollided(collided);
        if (super.shouldRemoveSelf) {
            if (collided == Sprite.model.m_player) {
                this.givePowerupTo(Sprite.model.m_player);
                new StringSprite(super.intx, super.inty, PowerupSprite.g_names[this.powerupType]).addSelf();
                return;
            }
            new ExplosionSprite(super.intx, super.inty).addSelf();
            final ParticleSprite particleSprite = new ParticleSprite(super.intx, super.inty);
            particleSprite.particleInit(20, 10);
            particleSprite.addSelf();
        }
    }
    
    static {
        //g_enemyRatios = new int[] { 0, 0, 0, 0, 0, 0, 0, 1, 0, 3, 4, 2, 1, 2, 1, 1, 1, 1, 0, 2 };
        g_enemyRatios = new int[] { 0, 0, 0, 0, 0, 0, 0, 1, 0, 3, 4, 2, 1, 2, 1, 1, 1, 1, 1, 2 };
        g_largeConverstionTypes = new int[] { 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 };
        g_smallConverstionTypes = new int[] { 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 };
        g_names = new String[] { "GUN UPGRADE", "THRUST UPGRADE", "RETROS", "INVULNERABILITY", "ZAP ATTACK", "EXTRA HEALTH", "HEAT SEEKER", "WORMHOLE TURRET", "WORMHOLE MINES", "SEND UFO", "SEND INFLATER", "SEND MINELAYER", "SEND GUNSHIP", "SEND SCARAB", "SEND NUKE", "SEND WALLCRAWLER", "WORMHOLE BEAM", "WORMHOLE EMP", "SEND GHOST-PUD", "SEND ARTILLERY" };
    }
    
    public static final int convertToSmallImage(final int n) {
        return PowerupSprite.g_smallConverstionTypes[n];
    }
    
    public static PowerupSprite genPowerup(final int n, final int n2) {
        int n3 = 0;
        if (WHUtil.randABSInt() % 3 == 0) {
            int i = 0;
            while (i == 0) {
                n3 = WHUtil.randABSInt() % 6;
                switch (n3) {
                    default: {
                        continue;
                    }
                    case 0: {
                        i = (Sprite.model.m_player.m_bMaxShotUpgrade ? 0 : 1);
                        continue;
                    }
                    case 1: {
                        i = (Sprite.model.m_player.m_bMaxThrustUpgrade ? 0 : 1);
                        continue;
                    }
                    case 2: {
                        i = (Sprite.model.m_player.m_bRetros ? 0 : 1);
                        continue;
                    }
                    case 3: {
                        if (Sprite.model.getTimeElapsed() > 120000L) {
                            n3 = 6;
                        }
                        else if (Sprite.model.getTimeElapsed() > 80000L && WHUtil.randABSInt() % 4 != 0) {
                            n3 = 14;
                        }
                        i = 1;
                        continue;
                    }
                    case 4: {
                        if (Sprite.model.getTimeElapsed() > 120000L) {
                            n3 = 7;
                        }
                        i = 1;
                        continue;
                    }
                    case 5: {
                        if (Sprite.model.getTimeElapsed() > 60000L) {
                            n3 = 14;
                        }
                        i = 1;
                        continue;
                    }
                }
            }
        }
        else {
            //final int n4 = (Sprite.model.m_logic.getSubscriptionLevel() < 2) ? 11 : 14;
            final int n4 = (Sprite.model.m_tableElement.allPowerupsAllowed()) ? 14 : 11;
            n3 = 6 + WHUtil.randABSInt() % n4;
            if (n3 == 14 && WHUtil.randABSInt() % 2 == 0) {
                n3 = 6 + WHUtil.randABSInt() % n4;
            }
        }
        final PowerupSprite powerupSprite = new PowerupSprite(n, n2, n3);
        powerupSprite.setVelocity(WHUtil.randInt(10), WHUtil.randInt(10));
        return powerupSprite;
    }
    
    public void behave() {
        super.behave();
        if (super.spriteCycle > 20) {
            if (super.spriteCycle > 1200) {
                super.shouldRemoveSelf = true;
            }
            this.ctype = 5;
            super.indestructible = false;
        }
    }
}

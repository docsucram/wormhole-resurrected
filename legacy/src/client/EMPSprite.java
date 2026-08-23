package client;
import java.awt.*;

public class EMPSprite extends Sprite
{
    private int m_stage;
    private double m_distX;
    private double m_distY;
    private PortalSprite m_portal;
    private double m_lagX;
    private double m_lagY;
    private static final int EMP_FORMING_DURATION = 65;
    private static final int EMP_FLASH_RADIUS = 320;
    private static final int EMP_FLASH_D_RADIUS = 8;
    private static final int EMP_FORMING = 0;
    private static final int EMP_BURSTING = 1;
    private static final int EMP_FADING = 2;
    private int m_radius;
    private int m_formation;
    
    public EMPSprite(final PortalSprite portal) {
        super(0, 0);
        this.init("emp", Sprite.model.m_player.intx, Sprite.model.m_player.inty, true);
        super.spriteType = 0;
        this.m_portal = portal;
        this.m_distX = this.m_portal.intx - Sprite.model.m_player.intx;
        this.m_distY = this.m_portal.inty - Sprite.model.m_player.inty;
        final double atan2 = Math.atan2(this.m_distY, this.m_distX);
        this.m_lagX = Math.cos(atan2) * 15.0;
        this.m_lagY = Math.sin(atan2) * 15.0;
    }
    
    public void drawSelf(final Graphics graphics) {
        graphics.setColor(super.m_color);
        WHUtil.drawTarget(graphics, super.intx, super.inty);
        graphics.translate(super.intx, super.inty);
        graphics.setFont(WormholeModel.fontTwelve);
        graphics.drawString("EMP: ", -5, -3);
        if (this.m_stage == 0) {
            final double n = this.m_formation / 65.0;
            final int n2 = (int)(this.m_distX * (1.0 - n));
            final int n3 = (int)(this.m_distY * (1.0 - n));
            graphics.translate(n2, n3);
            int n4 = 0;
            do {
                WHUtil.drawCenteredCircle(graphics, n4 * this.m_lagX, n4 * this.m_lagY, 20 - n4);
            } while (++n4 < 4);
            graphics.translate(-n2, -n3);
            graphics.setColor(Sprite.g_colors[super.m_slot][Math.max(0, (int)(19.0 - n * 20.0))]);
            WHUtil.drawCenteredCircle(graphics, 0.0, 0.0, (int)(n * 320.0));
            WHUtil.drawCenteredCircle(graphics, 0.0, 0.0, (int)(n * 320.0 + 1.0));
            WHUtil.drawCenteredCircle(graphics, 0.0, 0.0, (int)((1.0 - n) * 320.0 + 1.0));
            WHUtil.drawCenteredCircle(graphics, 0.0, 0.0, (int)((1.0 - n) * 320.0 + 1.0));
        }
        else if (this.m_stage == 1) {
            int n5 = 0;
            do {
                graphics.setColor(Sprite.g_colors[super.m_slot][(super.spriteCycle + n5) % 20]);
                final int n6 = this.m_radius - n5 * 2;
                if (n6 < 0) {
                    break;
                }
                WHUtil.drawCenteredCircle(graphics, 0.0, 0.0, n6);
            } while (++n5 < 10);
        }
        graphics.translate(-super.intx, -super.inty);
    }
    
    public boolean inViewingRect(final Rectangle rectangle) {
        return true;
    }
    
    public void behave() {
        super.behave();
        switch (this.m_stage) {
            case 0: {
                this.m_formation += 2;
                if (this.m_formation > 65) {
                    this.m_formation = 65;
                    ++this.m_stage;
                    return;
                }
                break;
            }
            case 1: {
                this.m_radius += 8;
                if (this.m_radius >= 320) {
                    this.m_radius = 320;
                    this.m_formation = 65;
                    ++this.m_stage;
                }
                if (this.m_radius > WHUtil.distanceFrom(this, Sprite.model.m_player)) {
                    Sprite.model.m_player.activateEMP();
                    return;
                }
                break;
            }
            case 2: {
                this.m_formation -= 3;
                if (this.m_formation <= 0) {
                    this.m_formation = 0;
                    super.shouldRemoveSelf = true;
                    return;
                }
                break;
            }
        }
    }
}

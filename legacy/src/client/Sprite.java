package client;
import java.awt.*;
import java.awt.image.*;

public class Sprite
{
    static final int MAX_SHADES = 20;
    static final int MAX_TYPES = 11;
    static final int EXPLOSION_TYPE = 8;
    static final int PURPLE_TYPE = 9;
    public static Color[][] g_colors;
    static final float[][] g_types;
    int collisionType;
    boolean m_bInDrawingRect;
    boolean m_bIsBullet;
    public boolean m_bIsHeatSeeker;
    boolean m_bSentByPlayer;
    byte m_slot;
    Color m_color;
    int allIndex;
    int secondaryIndex;
    public static Rectangle globalBoundingRect;
    public static WormholeModel model;
    public String name;
    public int type;
    double dRotate;
    int spriteType;
    public int m_powerupType;
    public static final int NEUTRAL = 0;
    public static final int BADGUY = 1;
    public static final int GOODGUY = 2;
    public int spriteCycle;
    public boolean shouldRemoveSelf;
    public double x;
    public double y;
    public int intx;
    public int inty;
    boolean bounded;
    boolean m_bZappable;
    Rectangle boundingRect;
    Rectangle shapeRect;
    int shapeType;
    static final double REBOUND_COEFF = -0.5;
    Rectangle myr;
    double[] dVector;
    public double angle;
    public double vectorx;
    public double vectory;
    public double maxThrust;
    public double maxVelocity;
    double radAngle;
    static int g_centerX;
    static int g_centerY;
    public boolean indestructible;
    int m_health;
    int m_damage;
    boolean bUseHealth;
    public boolean hasCollided;
    Sprite collidedObject;
    Polygon m_poly;
    int MAX_HEALTH;
    Image[] images;
    int[] heights;
    int[] widths;
    int numImages;
    int currentFrame;
    int cachedWidth;
    int cachedHeight;
    double m_thrust;
    Point m_leadPoint;
    
    public Rectangle getShapeRect() {
        return this.shapeRect;
    }
    
    public void addSelf() {
        switch (this.spriteType) {
            case 2: {
                this.secondaryIndex = Sprite.model.goodGuys.add(this);
                break;
            }
            case 1: {
                this.secondaryIndex = Sprite.model.badGuys.add(this);
                break;
            }
        }
        this.allIndex = Sprite.model.allSprites.add(this);
    }
    
    int distanceFrom(final Sprite sprite) {
        return WHUtil.distance(this.intx, this.inty, sprite.intx, sprite.inty);
    }
    
    void setLocation(final int intx, final int inty) {
        this.x = intx;
        this.y = inty;
        this.intx = intx;
        this.inty = inty;
    }
    
    public void doMaxThrust(final double n) {
        final double vectorx = Math.cos(this.radAngle) * n + this.vectorx;
        final double vectory = Math.sin(this.radAngle) * n + this.vectory;
        final double hyp = WHUtil.hyp(vectorx, vectory);
        if (hyp > this.maxThrust) {
            this.vectorx = this.maxThrust * vectorx / hyp;
            this.vectory = this.maxThrust * vectory / hyp;
            return;
        }
        this.vectorx = vectorx;
        this.vectory = vectory;
    }
    
    void handleCrash() {
    }
    
    void reverseTrack() {
        this.realTrack(Sprite.model.m_player.intx, Sprite.model.m_player.inty, true);
    }
    
    boolean oob() {
        return this.x < 0.0 || this.x > Sprite.globalBoundingRect.width || this.y < 0.0 || this.y > Sprite.globalBoundingRect.height;
    }
    
    void handleRebound() {
        final int width = this.boundingRect.width;
        final int height = this.boundingRect.height;
        double x = this.x;
        double y = this.y;
        if (this.x < 0.0) {
            x = 1.0;
            this.vectorx *= -0.5;
        }
        else if (this.x >= width) {
            x = width - 1;
            this.vectorx *= -0.5;
        }
        if (this.y < 0.0) {
            y = 1.0;
            this.vectory *= -0.5;
        }
        else if (this.y >= height) {
            y = height - 1;
            this.vectory *= -0.5;
        }
        this.setLocation(x, y);
        this.setVelocity(this.vectorx, this.vectory);
    }
    
    public static void initColors() {
        int n = 0;
        do {
            final float n2 = Sprite.g_types[n][0];
            float n3 = 1.0f;
            if (Sprite.g_types[n].length > 1) {
                n3 = Sprite.g_types[n][1];
            }
            int n4 = 0;
            do {
                Sprite.g_colors[n][n4] = Color.getHSBColor(n2, n3, (float)(1.0 - n4 * 0.04));
            } while (++n4 < 20);
        } while (++n < 11);
    }
    
    public void removeSelf() {
        Sprite.model.allSprites.remove(this.allIndex);
        switch (this.spriteType) {
            case 2: {
                Sprite.model.goodGuys.remove(this.secondaryIndex);
                break;
            }
            case 1: {
                Sprite.model.badGuys.remove(this.secondaryIndex);
                break;
            }
            default: {}
        }
    }
    
    public void drawImage(final Graphics graphics) {
        if (this.currentFrame >= this.numImages) {
            return;
        }
        graphics.drawImage(this.images[this.currentFrame], this.intx - this.cachedWidth, this.inty - this.cachedHeight, null);
    }
    
    void moveTowards(final int n, final int n2, final double n3) {
        this.calcTowards(n, n2, n3);
        this.vectorx = this.dVector[0];
        this.vectory = this.dVector[1];
        this.move(this.vectorx, this.vectory);
    }
    
    void decel(final double n) {
        if (Math.abs(this.vectorx) < 0.05) {
            this.vectorx = 0.0;
        }
        if (Math.abs(this.vectory) < 0.05) {
            this.vectory = 0.0;
        }
        this.vectorx *= n;
        this.vectory *= n;
    }
    
    void move(final double n, final double n2) {
        this.setLocation(this.x + n, this.y + n2);
        if (this.bounded) {
            this.handleRebound();
        }
        else if (this.oob()) {
            this.handleCrash();
        }
        if (this.shapeRect != null) {
            this.shapeRect.setLocation(this.intx - this.shapeRect.width / 2, this.inty - this.shapeRect.height / 2);
            this.myr = this.shapeRect;
        }
    }
    
    public void behave() {
        this.move(this.vectorx, this.vectory);
        ++this.spriteCycle;
        if (this.hasCollided || (!this.bounded && !this.inGlobalBounds())) {
            this.shouldRemoveSelf = true;
        }
    }
    
    void setPlayer(final byte b) {
        this.setPlayer(b, Sprite.g_colors[b][0]);
    }
    
    void setPlayer(final byte slot, final Color color) {
        this.m_slot = slot;
        this.m_color = color;
        this.m_bSentByPlayer = true;
    }
    
    boolean isRectPolyCollision(final Sprite sprite, final Sprite sprite2) {
        final Rectangle shapeRect = sprite.shapeRect;
        final Polygon poly = sprite2.m_poly;
        if (shapeRect == null || poly == null) {
            return false;
        }
        boolean b = false;
        if (sprite2.getShapeRect().intersects(shapeRect)) {
            final Polygon polygon = new Polygon();
            for (int n = 0; n < poly.npoints && !b; ++n) {
                polygon.addPoint(poly.xpoints[n] + sprite2.intx, poly.ypoints[n] + sprite2.inty);
                if (shapeRect.inside(poly.xpoints[n] + sprite2.intx, poly.ypoints[n] + sprite2.inty)) {
                    b = true;
                }
            }
            if (!b) {
                b = (polygon.contains(shapeRect.x, shapeRect.y) || polygon.contains(shapeRect.x + shapeRect.width, shapeRect.y) || polygon.contains(shapeRect.x, shapeRect.y + shapeRect.height) || polygon.contains(shapeRect.x + shapeRect.width, shapeRect.y + shapeRect.height));
            }
        }
        return b;
    }
    
    public boolean isCollision(final Sprite sprite) {
        switch (sprite.shapeType + this.shapeType) {
            case 0: {
                return this.isRectCollision(sprite);
            }
            case 1: {
                if (sprite.shapeType == 0) {
                    return this.isRectPolyCollision(sprite, this);
                }
                return this.isRectPolyCollision(this, sprite);
            }
            case 2: {
                return this.isPolyCollision(sprite);
            }
            default: {
                return false;
            }
        }
    }
    
    Point calcLead() {
        if (this.m_leadPoint == null) {
            this.m_leadPoint = new Point();
        }
        final PlayerSprite player = Sprite.model.m_player;
        this.m_leadPoint.x = (int)(player.x + player.vectorx * 15.0 - this.x);
        this.m_leadPoint.y = (int)(player.y + player.vectory * 15.0 - this.y);
        return this.m_leadPoint;
    }
    
    public Sprite() {
        this.m_slot = 8;
        this.m_color = Color.white;
        this.bounded = false;
        this.shapeType = 0;
        this.dVector = new double[2];
        this.indestructible = false;
        this.m_health = 1;
        this.m_damage = 1;
        this.hasCollided = false;
        this.collidedObject = null;
        this.numImages = 0;
        this.currentFrame = 0;
    }
    
    public Sprite(final int n, final int n2) {
        this.m_slot = 8;
        this.m_color = Color.white;
        this.bounded = false;
        this.shapeType = 0;
        this.dVector = new double[2];
        this.indestructible = false;
        this.m_health = 1;
        this.m_damage = 1;
        this.hasCollided = false;
        this.collidedObject = null;
        this.numImages = 0;
        this.currentFrame = 0;
        this.setLocation(n, n2);
    }
    
    void rotate(final double n) {
        this.setDegreeAngle(this.angle + n);
    }
    
    public Polygon getShapePoly() {
        return this.m_poly;
    }
    
    static void drawFlag(final Graphics graphics, final Color color, final int n, final int n2) {
        if (color != null) {
            graphics.setColor(color);
            graphics.fillRect(n, n2, 10, 7);
            graphics.drawLine(n, n2 + 7, n, n2 + 14);
        }
    }
    
    void killSelf() {
        this.killSelf(0, 0);
    }
    
    void killSelf(final int n, final int n2) {
        this.shouldRemoveSelf = true;
        new ExplosionSprite(this.intx, this.inty, this.m_slot).addSelf();
        if (n > 0) {
            final ParticleSprite particleSprite = new ParticleSprite(this.intx, this.inty);
            particleSprite.particleInit(n, n2);
            particleSprite.addSelf();
        }
    }
    
    public void drawSelf(final Graphics graphics) {
        final Polygon shapePoly = this.getShapePoly();
        if (this.m_color != null) {
            graphics.setColor(this.m_color);
        }
        else {
            graphics.setColor(Color.green);
        }
        if (shapePoly != null) {
            graphics.translate(this.intx, this.inty);
            graphics.drawPolygon(shapePoly.xpoints, shapePoly.ypoints, shapePoly.npoints);
            graphics.translate(-this.intx, -this.inty);
        }
        final Rectangle shapeRect = this.getShapeRect();
        if (this.m_bSentByPlayer) {
            drawFlag(graphics, this.m_color, shapeRect.x + shapeRect.width + 5, shapeRect.y + shapeRect.height + 5);
        }
    }
    
    void calcTowards(final int n, final int n2, final double n3) {
        final double n4 = n - this.x;
        final double n5 = n2 - this.y;
        final double hyp = WHUtil.hyp(n4, n5);
        this.dVector[0] = n3 * n4 / hyp;
        this.dVector[1] = n3 * n5 / hyp;
    }
    
    public static void setGlobalBounds(final int n, final int n2) {
        Sprite.globalBoundingRect = new Rectangle(0, 0, n, n2);
        Sprite.g_centerX = n / 2;
        Sprite.g_centerY = n2 / 2;
    }
    
    protected void realTrack(final int n, final int n2, final boolean b) {
        if (Sprite.model.m_player.shouldRemoveSelf) {
            return;
        }
        final double n3 = (WHUtil.findAngle(n, n2, this.x, this.y) + (b ? 180 : 360)) % 360.0;
        double dRotate = this.dRotate;
        final double n4 = n3 - this.angle;
        if (Math.abs(n4) <= this.dRotate) {
            dRotate = n4;
        }
        else if (Math.abs(n4) <= 180.0) {
            if (n4 < 0.0) {
                dRotate = -this.dRotate;
            }
        }
        else if (n4 > 0.0) {
            dRotate = -this.dRotate;
        }
        this.rotate(dRotate);
        this.doMaxThrust(this.m_thrust);
    }
    
    public void setCollided(final Sprite collidedObject) {
        if (!this.indestructible) {
            this.hasCollided = true;
            this.collidedObject = collidedObject;
            if (this.bUseHealth) {
                this.changeHealth(-collidedObject.m_damage);
                if (this.m_health < 1) {
                    this.shouldRemoveSelf = true;
                    return;
                }
                this.hasCollided = false;
            }
        }
    }
    
    static {
        Sprite.g_colors = new Color[11][20];
        g_types = new float[][] { { 0.1667f }, { 0.5f }, new float[1], { 0.3333f }, { 0.6944f, 0.3f }, { 0.1305f }, { 0.03f, 0.67f }, { 0.7777f }, { 0.125f }, { 0.8333f }, { 0.66677f, 0.67f } };
    }
    
    public boolean isPolyCollision(final Sprite sprite) {
        final Polygon shapePoly = sprite.getShapePoly();
        if (shapePoly == null || this.m_poly == null) {
            return false;
        }
        final int n = this.intx - sprite.intx;
        final int n2 = this.inty - sprite.inty;
        for (int i = 0; i < this.m_poly.npoints; ++i) {
            if (shapePoly.contains(this.m_poly.xpoints[i] - n, this.m_poly.ypoints[i] - n2)) {
                return true;
            }
        }
        for (int j = 0; j < shapePoly.npoints; ++j) {
            if (this.m_poly.contains(shapePoly.xpoints[j] + n, shapePoly.ypoints[j] + n2)) {
                return true;
            }
        }
        return false;
    }
    
    void setVelocity(final double vectorx, final double vectory) {
        this.vectorx = vectorx;
        this.vectory = vectory;
    }
    
    public boolean isRectCollision(final Sprite sprite) {
        final Rectangle shapeRect = sprite.getShapeRect();
        final Rectangle shapeRect2 = this.getShapeRect();
        if (shapeRect == null && shapeRect2 == null) {
            return false;
        }
        if (shapeRect == null && shapeRect2 != null) {
            return shapeRect2.inside(sprite.intx, sprite.inty);
        }
        if (shapeRect2 == null) {
            return shapeRect.inside(this.intx, this.inty);
        }
        return shapeRect.intersects(shapeRect2);
    }
    
    boolean inViewingRect(final Rectangle rectangle) {
        return this.getShapeRect() != null && this.getShapeRect().intersects(rectangle);
    }
    
    public boolean inGlobalBounds() {
        return Sprite.globalBoundingRect != null && Sprite.globalBoundingRect.inside(this.intx, this.inty);
    }
    
    public void setImages(final Image[] images, final int numImages) {
        this.images = images;
        this.numImages = numImages;
        this.cachedWidth = images[0].getWidth(null) / 2;
        this.cachedHeight = images[0].getHeight(null) / 2;
    }
    
    void init(final String name, final int n, final int n2, final boolean bounded) {
        this.setLocation(n, n2);
        this.name = name;
        this.boundingRect = Sprite.globalBoundingRect;
        this.bounded = bounded;
    }
    
    void track() {
        if (Sprite.model.m_player != null) {
            this.realTrack(Sprite.model.m_player.intx, Sprite.model.m_player.inty, false);
        }
    }
    
    void setHealth(final int health, final int damage) {
        this.bUseHealth = true;
        this.m_health = health;
        this.m_damage = damage;
        this.MAX_HEALTH = this.m_health;
    }
    
    void changeHealth(final int n) {
        this.m_health += n;
        if (this.m_health < 0) {
            this.m_health = 0;
            return;
        }
        if (this.m_health > this.MAX_HEALTH) {
            this.m_health = this.MAX_HEALTH;
        }
    }
    
    void setDegreeAngle(final double n) {
        this.angle = (n + 360.0) % 360.0;
        this.radAngle = this.angle * 0.017453292519943295;
    }
    
    void setLocation(final double x, final double y) {
        this.x = x;
        this.y = y;
        this.intx = (int)x;
        this.inty = (int)y;
    }
}

package client;
import java.util.*;
import java.awt.*;

public class WHUtil
{
    public static Random rand;
    static final double dtor = 0.017453292519943295;
    static final double rtod = 57.29577951308232;
    private static final int DIST = 60;
    private static final int IN = 40;
    static final int[][] g_target;
    
    public static int distance(final int n, final int n2, final int n3, final int n4) {
        return hyp(n - n3, n2 - n4);
    }
    
    public static void drawRect(final Graphics graphics, final Rectangle rectangle) {
        graphics.drawRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
    }
    
    public static double distanceFrom(final Sprite sprite, final Sprite sprite2) {
        return distance(sprite.x, sprite.y, sprite2.x, sprite2.y);
    }
    
    public static Polygon symPolygon(final int n, final int n2, final int n3) {
        final Polygon polygon = new Polygon();
        for (int i = 0; i < n; ++i) {
            final double n4 = n3 + 360 / n * i * 0.017453292519943295;
            polygon.addPoint((int)(n2 * Math.cos(n4)), (int)(n2 * Math.sin(n4)));
        }
        return polygon;
    }
    
    public static void fillRect(final Graphics graphics, final Rectangle rectangle) {
        graphics.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
    }
    
    public static void sleep(final int n) {
        try {
            Thread.sleep(n);
        }
        catch (Exception ex) {}
    }
    
    public static void drawTarget(final Graphics graphics, final int n, final int n2) {
        for (int i = 0; i < WHUtil.g_target.length; ++i) {
            graphics.drawLine(n + WHUtil.g_target[i][0], n2 + WHUtil.g_target[i][1], n + WHUtil.g_target[i][2], n2 + WHUtil.g_target[i][3]);
        }
    }
    
    public static int randABSInt() {
        return Math.abs(randInt());
    }
    
    public static void drawPoly(final Graphics graphics, final Polygon polygon) {
        graphics.drawPolygon(polygon.xpoints, polygon.ypoints, polygon.npoints);
    }
    
    public static boolean inside(final Rectangle rectangle, final Rectangle rectangle2) {
        return rectangle2.inside(rectangle.x, rectangle.y) && rectangle2.inside(rectangle.x + rectangle.width, rectangle.y + rectangle.height);
    }
    
    public static double randDouble() {
        return WHUtil.rand.nextDouble();
    }
    
    public static final void drawBoundCircle(final Graphics graphics, final int n, final int n2, final int n3, final Color color, final Color color2) {
        graphics.setColor(color2);
        graphics.fillOval(n, n2, n3, n3);
        graphics.setColor(color);
        graphics.drawOval(n, n2, n3, n3);
    }
    
    public static double scaleVector(final double n, final double n2) {
        return n / hyp(n, n2);
    }
    
    static {
        WHUtil.rand = new Random();
        g_target = new int[][] { { -60, -60, -40, -60 }, { -60, -60, -60, -40 }, { -60, 60, -40, 60 }, { -60, 60, -60, 40 }, { 60, -60, 40, -60 }, { 60, -60, 60, -40 }, { 60, 60, 40, 60 }, { 60, 60, 60, 40 } };
    }
    
    public static void fillCenteredArc(final Graphics graphics, final double n, final double n2, final int n3, final int n4, final int n5) {
        graphics.fillArc((int)n - n3, (int)n2 - n3, n3 * 2, n3 * 2, n4, n5);
    }
    
    static double findAngle(final double n, final double n2, final double n3, final double n4) {
        return Math.atan2(n2 - n4, n - n3) * 57.29577951308232;
    }
    
    public static void drawCenteredCircle(final Graphics graphics, final double n, final double n2, final int n3) {
        graphics.drawOval((int)n - n3, (int)n2 - n3, n3 * 2, n3 * 2);
    }
    
    public static final void drawBoundRect(final Graphics graphics, final int n, final int n2, final int n3, final int n4, final Color color, final Color color2) {
        graphics.setColor(color2);
        graphics.fillRect(n, n2, n3, n4);
        graphics.setColor(color);
        graphics.drawRect(n, n2, n3, n4);
    }
    
    public static boolean isPolygonIntersect(final Polygon polygon, final Polygon polygon2) {
        for (int i = 0; i < polygon.npoints; ++i) {
            if (polygon2.inside(polygon.xpoints[i], polygon.ypoints[i])) {
                return true;
            }
        }
        for (int j = 0; j < polygon2.npoints; ++j) {
            if (polygon.inside(polygon2.xpoints[j], polygon2.ypoints[j])) {
                return true;
            }
        }
        return false;
    }
    
    public static boolean isPolygonIntersect(final Polygon polygon, final Polygon polygon2, final int n, final int n2, final int n3, final int n4) {
        for (int i = 0; i < polygon.npoints; ++i) {
            //System.out.println("test: " + (polygon.xpoints[i] + n) + "y: " + (polygon.ypoints[i] + n2));
            if (polygon2.contains(polygon.xpoints[i] + n, polygon.ypoints[i] + n2)) {
                return true;
            }
        }
        for (int j = 0; j < polygon2.npoints; ++j) {
            //System.out.println("test: " + (polygon2.xpoints[j] + n3) + "Y: " + (polygon2.ypoints[j] + n4));
            if (polygon.contains(polygon2.xpoints[j] + n3, polygon2.ypoints[j] + n4)) {
                return true;
            }
        }
        return false;
    }
    
    public static int randInt() {
        return WHUtil.rand.nextInt();
    }
    
    public static int randInt(final int n) {
        return WHUtil.rand.nextInt() % n;
    }
    
    public static int hyp(final int n, final int n2) {
        return (int)Math.sqrt(n * n + n2 * n2);
    }
    
    public static double hyp(final double n, final double n2) {
        return Math.sqrt(n * n + n2 * n2);
    }
    
    public static void drawScaledPoly(final Graphics graphics, final Polygon polygon, final double n) {
        if (n == 1.0) {
            drawPoly(graphics, polygon);
            return;
        }
        int n2 = (int)(polygon.xpoints[0] * n);
        int n3 = (int)(polygon.ypoints[0] * n);
        for (int i = 1; i < polygon.npoints; ++i) {
            final int n4 = (int)(polygon.xpoints[i] * n);
            final int n5 = (int)(polygon.ypoints[i] * n);
            graphics.drawLine(n2, n3, n4, n5);
            n2 = n4;
            n3 = n5;
        }
        graphics.drawLine(n2, n3, (int)(polygon.xpoints[0] * n), (int)(polygon.ypoints[0] * n));
    }
    
    public static void fillCenteredCircle(final Graphics graphics, final double n, final double n2, final int n3) {
        graphics.fillOval((int)n - n3, (int)n2 - n3, n3 * 2, n3 * 2);
    }
    
    public static double distance(final double n, final double n2, final double n3, final double n4) {
        return hyp(n - n3, n2 - n4);
    }
}

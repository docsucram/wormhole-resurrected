package client;
import java.awt.*;

public class RotationalPolygon
{
    public Polygon poly;
    public int MAXPOINTS;
    public double[] angles;
    public double[] distances;
    public int points;
    public double currentAngle;
    
    public Polygon cloneMyPolygon() {
        return new Polygon(this.poly.xpoints, this.poly.ypoints, this.poly.npoints);
    }
    
    public void addPoint(final double n, final double n2) {
        if (this.points > this.MAXPOINTS - 1) {
            return;
        }
        this.distances[this.points] = n;
        this.angles[this.points] = n2 * 0.017453292519943295;
        final int n3 = (int)(Math.cos(this.angles[this.points]) * n);
        final int n4 = (int)(Math.sin(this.angles[this.points]) * n);
        ++this.points;
        this.poly.addPoint(n3, n4);
    }
    
    public RotationalPolygon(final int[][] array) {
        this();
        for (int n = 0; n < this.MAXPOINTS && n < array.length; ++n) {
            this.addIntPoint(array[n][0], array[n][1]);
        }
    }
    
    public RotationalPolygon() {
        this.MAXPOINTS = 24;
        this.currentAngle = 0.0;
        this.poly = new Polygon();
        this.angles = new double[this.MAXPOINTS];
        this.distances = new double[this.MAXPOINTS];
        this.points = 0;
    }
    
    public void addIntPoint(final int n, final int n2) {
        this.addPoint(WHUtil.hyp(n, n2), Math.atan2(n2, n) * 57.29577951308232);
    }
    
    public void rotate(final double n) {
        this.setAngle((this.currentAngle + n * 0.017453292519943295) % 360.0);
    }
    
    public static RotationalPolygon constructPolygon(final short[][] array, final boolean b) {
        final RotationalPolygon rotationalPolygon = new RotationalPolygon();
        for (int i = 0; i < array.length; ++i) {
            if (b || array[i][2] == 1) {
                rotationalPolygon.addIntPoint(array[i][0], array[i][1]);
            }
        }
        for (int j = array.length - 1; j >= 0; --j) {
            if (array[j][0] != 0 && (b || array[j][2] == 1)) {
                rotationalPolygon.addIntPoint(-array[j][0], array[j][1]);
            }
        }
        return rotationalPolygon;
    }
    
    static Polygon clonePolygon(final Polygon polygon) {
        return new Polygon(polygon.xpoints, polygon.ypoints, polygon.npoints);
    }
    
    public void setAngle(final double currentAngle) {
        if (currentAngle == this.currentAngle) {
            return;
        }
        this.currentAngle = currentAngle;
        for (int i = 0; i < this.points; ++i) {
            this.poly.xpoints[i] = (int)(Math.cos(this.angles[i] + this.currentAngle) * this.distances[i]);
            this.poly.ypoints[i] = (int)(Math.sin(this.angles[i] + this.currentAngle) * this.distances[i]);
        }
    }
    
    public void recalcPolygon() {
        this.poly = clonePolygon(this.poly);
    }
    
    public Polygon getShiftedPolygon(final int n, final int n2) {
        final Polygon polygon = new Polygon();
        for (int i = 0; i < this.poly.npoints; ++i) {
            polygon.addPoint(this.poly.xpoints[i] + n, this.poly.ypoints[i] + n2);
        }
        return polygon;
    }
}

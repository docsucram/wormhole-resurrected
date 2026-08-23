package server;
import java.util.List;
import java.util.Vector;

public class ServerTableManager {
	List<ServerTable> tables = new Vector<ServerTable>();
	
	public ServerTableManager(){}
	
	public synchronized List<ServerTable> tables(){
		return this.tables;
	}
	public synchronized ServerTable getTable(short tableId){
		return this.tables.get(tableId);
	}
	
	public synchronized void addTable(ServerTable table){
		// Loop over to find open slot, or add to end.
		// The id of the table is set to index of this list.
		short idx = 0;
		while (idx < tables.size() && tables.get(idx) != null){
			idx ++;
		}
		table.setId(idx);
		if (idx == tables.size()){
			tables.add(table);
		}
		else{
			tables.set(idx, table);
		}
	}
	
	public synchronized void removeTable(ServerTable table){
		tables.set(table.id(), null);
	}
}
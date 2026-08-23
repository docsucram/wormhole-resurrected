package server;
import java.util.Set;
import java.util.HashSet;
import java.util.List;
import java.util.Vector;

public class ServerUserManager {
	Set<String> usernames = new HashSet<String>();
	List<ServerUser> users = new Vector<ServerUser>();
	
	public ServerUserManager(){}
	
	public List<ServerUser> users(){
		return this.users;
	}
	
	public synchronized ServerUser getUser(short userId){
		return this.users.get(userId);
	}
	
	public boolean usernameTaken(String username) {
		return usernames.contains(username);
	}
	
	public synchronized void addUser(ServerUser user){
		// Loop over to find open slot, or add to end.
		// The id of the table is set to index of this list.
		short idx = 0;
		while (idx < users.size() && users.get(idx) != null){
			idx ++;
		}
		user.setUserId(idx);
		if (idx == users.size()){
			users.add(user);
		}
		else{
			users.set(idx, user);
		}
		usernames.add(user.username());
	}
	
	public synchronized void removeUser(ServerUser user){
		users.set(user.userId(), null);
		usernames.remove(user.username());
	}
}
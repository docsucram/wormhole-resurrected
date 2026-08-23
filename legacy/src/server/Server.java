package server;
import java.net.*;
import java.io.*;
import java.util.*;

public class Server{
	static final int PORT = 6049;
	List<ServerThread> clients = new Vector<ServerThread>();
	ServerUserManager userManager = new ServerUserManager();
	ServerTableManager tableManager = new ServerTableManager();
	
	public static void main(String args[]) throws Exception{
		new Server().process();
	}
	
	public void process() throws IOException{
		ServerSocket serverSocket = null;
		try {
			serverSocket = new ServerSocket(PORT);
			while(true){
				System.out.println("Waiting for client on port " + serverSocket.getLocalPort() + "...");
				Socket socket = serverSocket.accept();
				System.out.println("Just connected to " + socket.getRemoteSocketAddress());
				ServerThread client =  new ServerThread(this, socket);
				clients.add(client);
			}
		} catch(IOException e){
			
		} finally {
	        if (serverSocket != null) {
	        	serverSocket.close();
	        }
		}
	}
	
	void broadcastUser(ServerUser user) {
		for (ServerThread client : this.clients){
			client.sendMessages.add(()->client.sendUser(user));
		}
	}
	
	void broadcastUserLogout(ServerUser user) {
		for (ServerThread client : this.clients){
			client.sendMessages.add(()->client.sendUserLogout(user));
		}
	}
	
	void broadcastCreateTable(ServerTable table) {
		for (ServerThread client : this.clients){
			client.sendMessages.add(()->client.sendFullTable(table));
		}
	}
	
	void broadcastJoinTable(ServerTable table, String username, byte slot, byte teamId) {
		for (ServerThread client : this.clients){
			client.sendMessages.add(()->client.sendJoinTable(table, username, slot, teamId));
		}
	}
	
	void broadcastLeaveTable(short tableId, String username) {
		for (ServerThread client : this.clients){
			client.sendMessages.add(()->client.sendLeaveTable(tableId, username));
		}
	}
	
	void broadcastTableStatusChange(short tableId, byte status, short countdown) {
		for (ServerThread client : this.clients){
			client.sendMessages.add(()->client.sendTableStatusChange(tableId, status, countdown));
		}
	}
	
	void broadcastTeamChange(ServerTable table, byte slot, byte teamId) {
		for (ServerUser user : table.users()) {
			if (user == null) continue;
			user.client().sendMessages.add(()->user.client().sendTeamChange(slot, teamId));
		}
	}
	
	void broadcastGameStart(ServerTable table) {
		for (ServerUser user : table.users()) {
			if (user == null) continue;
			user.client().sendMessages.add(()->user.client().sendGameStart(table));
		}
	}
	
	void broadcastPowerup(ServerTable table, byte powerupType, byte toSlot, byte b1, short gameSession, byte b2) {
		for (ServerUser user : table.users()) {
			if (user == null) continue;
			user.client().sendMessages.add(()->user.client().sendPowerup(powerupType, toSlot, b1, gameSession, b2));
		}
	}
	
	void broadcastPlayerState(ServerTable table, short gameSession, byte slot, short healthPerc, Byte[] powerups, byte shipType) {
		for (ServerUser user : table.users()) {
			if (user == null) continue;
			user.client().sendMessages.add(()->user.client().sendPlayerState(gameSession, slot, healthPerc, powerups, shipType));
		}
	}
	
	void broadcastPlayerEvent(ServerTable table, short gameSession, String eventString) {
		for (ServerUser user : table.users()) {
			if (user == null) continue;
			user.client().sendMessages.add(()->user.client().sendPlayerEvent(gameSession, eventString));
		}
	}
	
	void broadcastGameOver(ServerTable table, short gameSession, byte deceasedSlot, byte killerSlot) {
		for (ServerUser user : table.users()) {
			if (user == null) continue;
			user.client().sendMessages.add(()->user.client().sendGameOver(gameSession, deceasedSlot, killerSlot));
		}
	}
	
	void broadcastGameEnd(ServerTable table) {
		for (ServerUser user : table.users()) {
			if (user == null) continue;
			user.client().sendMessages.add(()->user.client().sendGameEnd(table));
		}
	}
	
	void broadcastGlobalMessage(String username, String message) {
		boolean isForLobby = true;
		for (ServerThread client : this.clients) {
			client.sendMessages.add(()->client.sendGlobalMessage(username, message, isForLobby));
		}
	}
	
	void broadcastGlobalMessage(ServerTable table, String username, String message) {
		boolean isForLobby = false;
		for (ServerUser user : table.users()) {
			if (user == null) continue;
			user.client().sendMessages.add(()->user.client().sendGlobalMessage(username, message, isForLobby));
		}
	}
	
	void broadcastPrivateMessage(String fromUser, String toUser, String message) {
		for (ServerThread client : this.clients) {
			if (client.user().username().equals(toUser)) {
				client.sendMessages.add(()->client.sendPrivateMessage(fromUser, toUser, message));
			}
			if (client.user().username().equals(fromUser)) {
				client.sendMessages.add(()->client.sendPrivateMessage(fromUser, toUser, message));
			}
		}
	}
	
	void addUser(ServerUser user){
		this.userManager.addUser(user);
	}
	
	void addTable(ServerTable table){
		this.tableManager.addTable(table);
	}
}

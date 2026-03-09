package com.example.agriverse.repository;

import com.example.agriverse.model.Issue;
import com.example.agriverse.model.IssueStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface IssueRepository extends JpaRepository<Issue, Long> {

    Page<Issue> findByFarmerUsername(String username, Pageable pageable);

    Page<Issue> findByFarmerId(Long farmerId, Pageable pageable);

    Page<Issue> findByStatus(IssueStatus status, Pageable pageable);

    Page<Issue> findByStatusIn(List<IssueStatus> statuses, Pageable pageable);

    Page<Issue> findByAssignedOfficerUsername(String username, Pageable pageable);

    @Query("SELECT i FROM Issue i WHERE i.latitude IS NOT NULL AND i.longitude IS NOT NULL")
    List<Issue> findAllWithLocation();

    @Query("SELECT i FROM Issue i WHERE i.status IN :statuses AND i.latitude IS NOT NULL AND i.longitude IS NOT NULL")
    List<Issue> findByStatusInWithLocation(@Param("statuses") List<IssueStatus> statuses);

    Page<Issue> findByAssignedOfficerIsNullAndStatus(IssueStatus status, Pageable pageable);

    List<Issue> findByIdIn(List<Long> ids);
}
